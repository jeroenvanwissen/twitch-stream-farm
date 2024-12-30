import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Field } from './entities/field.entity';
import { FieldState } from './entities/field-state.entity';

@Injectable()
export class FieldService {
  constructor(
    @InjectRepository(Field)
    private fieldRepository: Repository<Field>,

    @InjectRepository(FieldState)
    private fieldStateRepository: Repository<FieldState>,
  ) {}

  async getAllFields(): Promise<Field[]> {
    return this.fieldRepository.find({
      relations: [
        'fieldState',
        'fieldState.crop',
        'fieldState.crop.growthStages',
      ],
    });
  }

  async getFieldByNumber(fieldnumber: number): Promise<Field> {
    return this.fieldRepository.findOne({
      where: {
        fieldnumber,
      },
      relations: ['fieldState'],
    });
  }

  async updateFieldsFromJson(file: fs.PathOrFileDescriptor): Promise<void> {
    const fileContent = fs.readFileSync(file, 'utf-8');
    const fields = JSON.parse(fileContent);

    for (const field of fields) {
      const fieldStateEntity = await this.fieldStateRepository.save({
        cycleStartTime: null,
        hasSummonedPlayerForSowing: false,
        hasSummonedPlayerForHarvesting: false,
        hasSummonedPlayerForWatering: false,
        isDry: true,
        isFertilized: false,
        isReadyForHarvest: false,
        isWatered: false,
        stageIndex: null,
        stageStartTime: null,
        crop: null,
      });

      await this.fieldRepository.save({
        fieldnumber: field.fieldnumber,
        type: field.type,
        locationX: field.x,
        locationY: field.y,
        width: field.width,
        height: field.height,
        signX: field.signX,
        signY: field.signY,
        fieldStateId: fieldStateEntity.id,
      });
    }
  }

  async getRandomEmptyField(): Promise<Field | null> {
    const fields = await this.fieldRepository.find({
      relations: ['fieldState', 'fieldState.crop'],
    });

    const emptyFields = fields.filter(
      (field) =>
        field.type === 'SOIL' &&
        !field.fieldState.crop &&
        !field.fieldState.cycleStartTime,
    );

    if (emptyFields.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * emptyFields.length);
    return emptyFields[randomIndex];
  }

  async getFieldsWithCrops(): Promise<Field[]> {
    const fields = await this.fieldRepository.find({
      relations: [
        'fieldState',
        'fieldState.crop',
        'fieldState.crop.growthStages',
      ],
    });
    return fields.filter(
      (field) => field.type === 'SOIL' && field.fieldState.crop !== null,
    );
  }

  async updateFieldState(
    fieldId: number,
    updates: Partial<FieldState>,
  ): Promise<Field> {
    const field = await this.fieldRepository.findOne({
      where: { id: fieldId },
      relations: [
        'fieldState',
        'fieldState.crop',
        'fieldState.crop.growthStages',
      ],
    });

    if (!field) {
      throw new Error(`Field with id ${fieldId} not found`);
    }

    if (field.type !== 'SOIL' && updates.crop) {
      throw new Error('Cannot plant crops on non-SOIL fields');
    }

    await this.fieldStateRepository.update(field.fieldStateId, updates);

    return this.fieldRepository.findOne({
      where: { id: fieldId },
      relations: [
        'fieldState',
        'fieldState.crop',
        'fieldState.crop.growthStages',
      ],
    });
  }

  async getFieldByCoordinates(x: number, y: number): Promise<Field> {
    return this.fieldRepository.findOne({
      where: {
        signX: x,
        signY: y,
      },
      relations: [
        'fieldState',
        'fieldState.crop',
        'fieldState.crop.growthStages',
      ],
    });
  }

  async resetFields(): Promise<void> {
    await this.fieldStateRepository.update(
      {},
      {
        cycleStartTime: null,
        hasSummonedPlayerForSowing: false,
        hasSummonedPlayerForHarvesting: false,
        hasSummonedPlayerForWatering: false,
        isDry: true,
        isFertilized: false,
        isReadyForHarvest: false,
        isWatered: false,
        stageIndex: null,
        stageStartTime: null,
        crop: null,
      },
    );
  }
}
