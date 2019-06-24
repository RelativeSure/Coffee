let Item = require("../class/item");
const ufmt = require("../utils/fmt.js");
const BigInt = require("big-integer");
const BigNum = require('bignumber.js');
var bpUtils = require("../utils/bp");

class ItemSilver extends Item{
	constructor(){
		super();
		this.name = "Silver"; // Required
		this.accessor = "silver"; // Virtural

		this.consumable = true;
		this.value = 1;
		this.rank = 2;
		this.meta = {};

		//this.icon = "https://i.imgur.com/506QOWO.png";
		this.isSaleRestricted = true;
		this.isDroppedByLootbox = true;
		this.canUseMulti = true;

		this.increaseValue = 0.08;
	}

	
	use( lToken, itemData ){
		let amount = lToken.mArgs.amount || 1;
		let bal = bpUtils.getCurrentBPBal( lToken );
		let outcome = new BigInt( new BigNum( bal.toString() ).times(new BigNum(1+this.increaseValue*0.01).pow( amount )).integerValue().toString() ).subtract(bal);
		bpUtils.addBP( lToken, outcome );
		lToken.send( Item.fmtUseMsg( `You exchange your ${ ufmt.itemName(this.name, amount)} for BP!`,[`+ ${ ufmt.bp( outcome ) } BP \n( + ${ufmt.numPretty( Math.round( (Math.pow(1+0.01*this.increaseValue, amount)-1)*100) )}% )`]) );
	}

	desc( lToken, itemData ){
		let desc = `A metal, worth ${this.increaseValue}% of your current BP bal.`;
		if(!itemData){ return desc; }
		let amount = itemData.amount || 0;
		let bal = bpUtils.getCurrentBPBal( lToken );
		let outcome = new BigInt( new BigNum( bal.toString() ).times(new BigNum(1+this.increaseValue*0.01).pow( itemData.amount )).integerValue().toString() ).subtract(bal);
		return ufmt.itemDesc([
			desc,
			ufmt.denote('Currently owned', amount ),
			ufmt.denote('Worth', ufmt.bp(outcome))
		]);
	}
}

module.exports = new ItemSilver();