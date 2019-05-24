let Item = require("../class/item");
const ufmt = require("../utils/formatting.js");
const bp = require("../utils/bp.js");
const itemUtils = require("../utils/item.js");
const BigInt = require("big-integer");

/**
 * 
 * @param {String} outcomes 
 * @param {*} mobile 
 */
function fmtLootboxOutcome( outcomes, mobile ){
	let strLen = outcomes.map(x=>x.length).reduce( (acc, val)=>{ return Math.max(acc, val); } )+2;
	let spoilers = mobile ? '' : "||";
	let ws = ufmt.embedWS;
	let content = outcomes.map( (x)=>{
		return `\`[ ${ufmt.padCenter(`${x}`, strLen)} ]\``}
	);
	return `${spoilers}${content.join("\n")}${spoilers}`;
}

const enabledLootboxes = ['lootbox', 'lunchbox'];
const allLootboxes = ['lootbox', 'lunchbox', 'daily_box', 'box_box', 'pick_box', 'goldbox', 'testbox'];

/**
 * Why are the lootbox helpers located under itemUtils and not here?
 * 
 * Because it's easier to debug under itemUtils
 */

class ItemLootbox extends Item{
	constructor(){
		super();
		this.name = "Lootbox"; // Required
		this.accessor = "lootbox"; // Virtural

		this.consumable = true;
		this.value = 0;
		this.rank = 1;
		this.meta = {};
		this.icon = "https://i.imgur.com/u3RS3gh.png";
		
		// Can the item be used multiple times?
		this.canUseMulti = true; // Enables amount modifier

		// Create an instance of each type of lootbox for use later
		this.metaInstances = {};
		allLootboxes.map( ( itemMetaLabel )=>{
			this.metaInstances[itemMetaLabel] = this.createItemData( 1, itemMetaLabel);
		}, this);
	}

	/**
	 * Override
	 * @param {*} amount 
	 * @param {*} meta 
	 * @param {*} name 
	 * @param {*} adminRigs 
	 */
	createItemData( amount=1, meta, name, adminRigs ){
		let drops = adminRigs || ['lootbox', 'lunchbox'];
		if(!meta){
			meta = ufmt.pick(drops, 1)[0];
		}
		return { accessor:'lootbox', amount: amount, name:meta, meta:meta }
	}
	
	pickItemsFromStoch( stoch, amount, dropFilter=itemUtils.lunchboxDropFilter ){
		let stochasticOutcomes = ufmt.pick( stoch, amount );
		let itemObjectOutcomes = stochasticOutcomes.map(( rank, i )=>{
			// Might want to cache this for performance increase

			// If there is available drop for this rank, try for the rank directly below it.
			function doPick(r){
				let filteredDrops = itemUtils.dropsByRank[r].filter( dropFilter ).filter((x)=>{return !!x;});
				let chosenDrop = ufmt.pick( filteredDrops, 1 )[0];
				if(r==-1){
					// if it fails to find something, give the user gold instead.
					return itemUtils.items.gold;
				}
				if(!chosenDrop){
					return doPick(r-1);
				}
				return chosenDrop;
			}
			return doPick(rank);
		});
		return itemObjectOutcomes;
	}

	tallyItemOutcomes( outcomes ){
		let accessors = outcomes.map( (itemObject)=>{return itemObject.name||itemObject.accessor} );
		// This is a tally snippet
		let tallyObject = {}
		accessors.map((accessor)=>{
			if(!tallyObject[accessor]){tallyObject[accessor]=1;}
			else{
				tallyObject[accessor]++;
			}
		})
		return tallyObject;
	}

	formatTalliedOutcomes( tallyObject ){
		return Object.keys(tallyObject).map( (accessor)=>{
			return ufmt.itemName(accessor, tallyObject[accessor], '', false);
		} );
	}

	processLootboxOutcomes( lToken, stoch, amount, dropFilter ){
		let outcomes = this.pickItemsFromStoch( stoch, amount, dropFilter );
		let itemDatas = outcomes.map( ( itemObject )=>{
			// Since it's generated, we let the item decide how its going to generate its itemdata
			return itemObject.createItemData();
		});
		let tallyObject = this.tallyItemOutcomes( itemDatas );
		let formattedTallies = this.formatTalliedOutcomes( tallyObject );

		itemDatas.map( ( outcomeItemData )=>{
			itemUtils.addItemToInventory( lToken.userData, outcomeItemData );
		});

		return formattedTallies;
	}





	/**
	 * A lootbox that drops food items
	 * @param {*} lToken 
	 * @param {*} itemData 
	 */
	meta_lunchbox( lToken, itemData ){
		let formattedTallies = this.processLootboxOutcomes( lToken, itemUtils.lunchboxDropStoch, 2*lToken.mArgs.amount, itemUtils.lunchboxDropFilter );
		let useDialogue = `You open up your home-made ${ ufmt.item( itemData, lToken.mArgs.amount ) }\nand inside it, you find...`;
		lToken.send( Item.fmtUseMsg( useDialogue, [fmtLootboxOutcome( formattedTallies, lToken.mobile )]) );
	}

	/**
	 * A lootbox that drops any sort of items
	 * @param {*} lToken 
	 * @param {*} itemData 
	 */
	meta_lootbox( lToken, itemData ){
		let formattedTallies = this.processLootboxOutcomes( lToken, itemUtils.globalDropStoch, 2*lToken.mArgs.amount, itemUtils.lootboxDropFilter );
		let useDialogue = `You open up a ${ ufmt.item( itemData, lToken.mArgs.amount ) }\nand inside it, you find...`;
		lToken.send( Item.fmtUseMsg( useDialogue, [fmtLootboxOutcome( formattedTallies, lToken.mobile )]) );
	}

	/**
	 * A lootbox that drops a pickaxe
	 * @param {*} lToken 
	 * @param {*} itemData 
	 */
	meta_pickbox( lToken, itemData ){

	}

	/**
	 * A lootbox that drops gold
	 * @param {*} lToken 
	 * @param {*} itemData 
	 */
	meta_goldbox( lToken, itemData ){
		let amount = lToken.mArgs.amount;
		let outcome = 0;
		new Array(amount).fill(0).map( ()=>{
			outcome += Math.ceil( Math.random()*3 );
		})
		let dropItemData = itemUtils.items.gold.createItemData( outcome );
		let useDialogue = `You open up a ${ ufmt.item( itemData, lToken.mArgs.amount ) }\nand inside it, you find...`;
		lToken.send( Item.fmtUseMsg( useDialogue, [`\`${ufmt.item( dropItemData, null, '' )}\``]) );
		itemUtils.addItemToInventory( lToken.userData, dropItemData );
	}

	/**
	 * A lootbox that drops other lootboxes!
	 * @param {*} lToken 
	 * @param {*} itemData 
	 */
	meta_box_box( lToken, itemData ){
		let amount = 2*lToken.mArgs.amount;
		let itemDatas = new Array(amount).fill(0).map( ()=>{
			return this.createItemData();
		})
		let formattedTallies = this.formatTalliedOutcomes( this.tallyItemOutcomes( itemDatas ) );
		itemDatas.map( ( outcomeItemData )=>{
			itemUtils.addItemToInventory( lToken.userData, outcomeItemData );
		});

		let useDialogue = `You open up a ${ ufmt.item( itemData, lToken.mArgs.amount ) }\nand inside it, you find...`;
		lToken.send( Item.fmtUseMsg( useDialogue, [fmtLootboxOutcome( formattedTallies, lToken.mobile )]) );
	}

	meta_testbox( lToken, itemData ){
		//lToken.send(":D how did you find me?");
		lToken.messageAdmin( ufmt.join([
			ufmt.denote('Type','Invalid Lootbox used'),
			ufmt.denote('User',ufmt.name(lToken.userData)),
			ufmt.denote('Command', ufmt.code(lToken.msg)),
			ufmt.denote('ItemData', ufmt.code(JSON.stringify(itemData, null, "\t"),"json"))
		]));
		let newLootboxData = itemUtils.items.lootbox.createItemData(lToken.mArgs.amount, 'lootbox');
		lToken.send(`Whoa... You're not supposed to have this item!!. Here, have a ${ufmt.item(newLootboxData)} instead.`);
		itemUtils.addItemToInventory( lToken.userData, newLootboxData );
	}

	/**
	 * A special lootbox you can only obtain once a day!
	 * @param {*} lToken 
	 * @param {*} itemData 
	 */
	meta_daily_box(lToken, itemData){
		let amount = 2*lToken.mArgs.amount;
		let itemDatas = new Array(amount).fill(0).map( ()=>{
			return this.createItemData();
		})
		let formattedTallies = this.formatTalliedOutcomes( this.tallyItemOutcomes( itemDatas ) );
		itemDatas.map( ( outcomeItemData )=>{
			itemUtils.addItemToInventory( lToken.userData, outcomeItemData );
		});

		let useDialogue = `You open up a ${ ufmt.item( itemData, lToken.mArgs.amount ) }\nand inside it, you find...`;
		lToken.send( Item.fmtUseMsg( useDialogue, [fmtLootboxOutcome( formattedTallies, lToken.mobile )]) );
	}

	/**
	 * For debugging purposes
	 * gives the user 1000 random lootboxes
	 * uses enabledLootboxes
	 * @param {*} lToken 
	 * @param {*} itemData 
	 */
	meta_adminbox1000( lToken, itemData ){
		let amount = 1000*lToken.mArgs.amount;
		let itemDatas = new Array(amount).fill(0).map( ()=>{
			return this.createItemData(1, null, null, allLootboxes);
		})
		let formattedTallies = this.formatTalliedOutcomes( this.tallyItemOutcomes( itemDatas ) );
		itemDatas.map( ( outcomeItemData )=>{
			itemUtils.addItemToInventory( lToken.userData, outcomeItemData );
		});

		let useDialogue = `You open up a ${ ufmt.item( itemData, lToken.mArgs.amount ) }\nand inside it, you find...`;
		lToken.send( Item.fmtUseMsg( useDialogue, [fmtLootboxOutcome( formattedTallies, lToken.mobile )]) );
	}





	// Virural function
	use( lToken, itemData ){
		// Test
		if(this[`meta_${itemData.meta}`]){
			this[`meta_${itemData.meta}`](lToken, itemData);
		} else {
			this.meta_testbox(lToken, itemData);
		}
		
	}

	desc( lToken, itemData ){
		switch(itemData.meta){
			case 'lunchbox':
				return ufmt.join([
					`*A wooden box full of food!*`,
					ufmt.denote("Usage",`Drops ${ufmt.block(2)} random consumables.` ),
					ufmt.denote("Possible Drops", `\n${ufmt.joinGrid(itemUtils.drops_lootbox_lunchbox.map((itemObject)=>{
						return ufmt.block( itemObject.name );
					}),', ',4)}`)
				]);
			case 'lootbox':
				return ufmt.join([
					`*A box full of loot*`,
					ufmt.denote("Usage",`Drops ${ufmt.block(2)} random items.` ),
					ufmt.denote("Possible Drops", `\n${ufmt.joinGrid(itemUtils.drops_lootbox_lootbox.map((itemObject)=>{
						return ufmt.block( itemObject.name );
					}),', ',4)}`)
				]);
			case 'goldbox':
				return ufmt.join([
					`*A box full of gold*`,
					ufmt.denote("Usage",`Drops ${ufmt.block('1-3')} gold.` ),
					ufmt.denote("Possible Drops", `\n${ufmt.block( itemObject.name )}`)
				]);
			case 'daily box':
				return ufmt.join([
					`*A special lootbox you can only obtain once a day*`,
					ufmt.denote("Usage",`Drops ${ufmt.block('3')} random types of lootboxes.` ),
					ufmt.denote("Possible Drops", `\n${ufmt.joinGrid([
						'Lootbox', 'Lunchbox', 'Gold Box'
					].map((itemObject)=>{
						return ufmt.block( itemObject.name );
					}),', ',4)}`)
				])
			default:
				return ufmt.join([
					`Lootboxes contain loot!`,
					`There are several types of lootboxes...`,
					(['Lunchbox', 'Large Lunchbox']).map((x)=>{return ufmt.block(x);}).join(", ")
				]);

		}		
	}
}

module.exports = new ItemLootbox();