
let {getCurrentBPBal, addBP, calcIncome, pickaxeLevelUD, calcIncome_UD} = require("../../utils/bp");
let ufmt = require("../../utils/fmt");
let bp = require("../../utils/bp");
let itemUtils = require("../../utils/item");
const BigInt = require("big-integer");
const locale = require("../../data/EN_US.json");
const pickaxe = itemUtils.items.pickaxe;
module.exports = function( Chicken, userData ){
	if(!userData){ userData = Chicken.userData; }

	let firstUseDay = Math.floor((new Date().getTime() - userData.firstuse)/1000/60/60/24);
	let badges = ([userData.tester?'Beta Tester':'', ...userData.tags]).map((tag)=>{ return ufmt.badge( tag ); }).join(" ");
	if(userData.pickaxe_perks.length>5){
		//Chicken.mArgs.maxPages+=Math.ceil(userData.pickaxe_perks.length/5)-1;
	}
	let pickaxeIncome = ufmt.bp( bp.calcPickaxeIncome( userData ) );
	let perkDescriptions = userData.pickaxe_perks.map((x)=>{
		let perk = itemUtils.pickPerks[ x ];
		let desc = `\n- ${ufmt.block(perk.name, "***")}`;
		if(userData.pickaxe_perks.length < 5){
			desc+= `: *${perk.desc || "No description"}*`;
		}
		return desc;
	}).join('');

	let activePickaxeItemData = pickaxe.getActivePickaxeItemData( userData );

	let fields = [
		[
			{
				"name": ufmt.block( "General" ),
				"value": [
					ufmt.denote('Rank', ufmt.block(Chicken.shared.modules.db.global.leaderboards[String(userData.id)].rank)),
					ufmt.denote('First Use', `${ ufmt.block(firstUseDay) } days ago`),
					ufmt.denote('Badges', badges),
					ufmt.denote('Commands Used', ufmt.block(userData.cmdcount)),
					ufmt.denote('Last Use', ufmt.timeLeft(userData.lastuse, new Date().getTime()) + ' ago'),
					ufmt.denote('Discord ID', ufmt.block( userData.id) ),
					(userData.blacklisted?ufmt.denote('Banned', ufmt.block("Yes")):null)
				].filter(x=>!!x).join("\n"),
				inline:true
			},
			{
				name:ufmt.block( `Blob Points` ),
				value:[
					ufmt.denote('Gold', ufmt.block( userData.items.gold ? userData.items.gold.amount : 0 ) + ' Coins'),
					ufmt.denote('Income', ufmt.block( ufmt.numPrettyIllion( bp.calcIncome_UD( userData) ) )+' BP/s'),
					ufmt.denote('Balance', ufmt.block( ufmt.numPrettyIllion( userData.bpbal ) )+' BP'),
					ufmt.denote('Life-Time Earnings', ufmt.block( ufmt.numPrettyIllion( userData.bptotal ) )+' BP'),
					ufmt.denote('Orbs', `${ufmt.block( userData.orbs )} ( + ${Math.pow(2,userData.orbs)}x income )`)
				].join("\n"),
				inline:true
			}
		],
		[
			{
				"name":ufmt.block( `Pickaxe` ),
				"value":[
					ufmt.denote('Name', `${ufmt.block(activePickaxeItemData.name)} tier ${ufmt.block( pickaxe.getTier( activePickaxeItemData ))}`),
					ufmt.denote('Multiplier', `x${pickaxe.getMultiplier(activePickaxeItemData)}` ),
					ufmt.denote('Exp', ufmt.progressBar( userData.pickaxe_exp%16, 16, `LvL ${pickaxeLevelUD( userData )}`, 16 ) ),
					ufmt.denote('Cooldown', ufmt.block(userData.pickaxe_time*60) ),
					ufmt.denote('Income', `+${pickaxeIncome} / mine`),
					ufmt.denote('Perk Slots', `${userData.pickaxe_perks.length}/${itemUtils.items.pickaxe.getMaxPerkSlots( activePickaxeItemData )}`),
					ufmt.denote('Perks', `${perkDescriptions.length > 0 ? `${perkDescriptions}` : "This pickaxe has no perks."}`)
				].join("\n")
			}
		]
	]

	return {
		"embed": {
			"color": 0xfec31b,
			"author":locale.views.authors.coffee,
			"title":`${ufmt.name(userData)}'s profile`,
			"fields": fields[Chicken.mArgs.page]
		}
	};
};