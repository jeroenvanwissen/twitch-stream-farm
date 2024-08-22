# Twitch Stream Farm

## Introduction

Stream Farm, a fun little (partly) idle game that I have running on my co-working Twitch streams.

The main idea of the game is that you just spawn and the player starts moving around randomly automatically.
Every now and then the player will go to a random empty field and starts sowing & watering the field.

During the growth cycle of a crops, whenever the field needs watering or is ready to be harvested, 
the field looks for the closest player and have that player move to the field to have the watering or harvesting done automatically.

You can of course have your player move around manually if you want to interact with the game a bit,
after 2 minutes of idling, the player will start moving around randomly again.

Got new ideas? Contact me or just file an issue here in GitHub
Bugs? see below.. also a list of open known bugs...

## Commands

Use <code>!spawn</code> to join the farm, your player will start randomly moving around.

### Inventory
<code>!inventory</code>

Check what you have and how many... seed, crops and coins.

### Moving around 

#### Fields
<code>!move field [field_number]</code>

Once arrived on a field, the player will automatically sow the seed of a random crops for which they have seed in their inventory.
If the field needs watering, the field will be watered. If the field is ready for harvest, it will be harvested etc.

#### Barn
<code>!move barn</code>

At the barn, you can just hang around for now... 

#### Greenhouse
<code>!move greenhouse</code>

At the greenhouse, you can use these commands to buy / sell items

<code>!buy seed [crops] [amount]</code>

<code>!sell [crops]</code>

To sell all harvested crops from your inventory in one go:
<code>!sell all</code>

Available crops / seed at this moment are:

* Carrot
* Cauliflower
* Corn
* Pumpkin

## Roadmap / Future features

### Greenhouse updates / Marketplace

I'm curently working out some of the logic for the marketplace in the greenhouse:

* Dynamic pricing of seeds to buy and crops to sell
* Addition of new crops types

### Fertilizer

To speed up the growth cycle on a field, you can optionally add fertilizer to a field.
You'll be able to buy fertilizer in the greenhouse marketplace.

### Revenue sharing

As the farming happens randomly, a player can harvest crops that other players sowed.
To make it a bit more fair, I'll be adding revenue sharing so that each player that did some work during that cycle will get a share of the revenue

## Bugs

If you find any bugs during gameplay, just report them in chat.. or file an issue here.

Current open known bugs:

* Unable to sell a specific crop at the greenhouse, only <code>!sell all</code> works
