//bible.js
require('dotenv').config()
const request = require('request-promise-native');
const log = require('logchalk');
const nedb = require('nedb');
const db = new nedb({filename: './data/passages.nedb', autoload: true});
const provDB = new nedb({filename: './data/proverbs.nedb', autoload: true});

const AUTH_TOKEN = process.env.ESVTOKEN;

module.exports = {get, getRandomProverb};

async function get(query){
	return new Promise(async (resolve, reject)=>{		
		var passage = await getFromDB(query).catch(log.warn);
				
		if(passage){
			resolve(passage);
			return;
		}
		
		passage = await getFromESV(query).catch(log.err);
				
		if(passage){
			resolve(passage);
			return;
		}
		
		resolve({title: "Bible", text: "no results for: "+query, next:"/", prev: "/"});
	});
}

async function getFromDB(query){
	return new Promise((resolve, reject)=>{

		//check the database first
		db.findOne({queries: query},function(err, result){
			
			if(result){
				log.info("found in db: "+result.title);
				
				resolve({
					title: result.title,
					text: result.text,
					next: result.next,
					prev: result.prev
				});
			}
			else reject('not found in db: '+query);
		});
	});
}

function updateDB(query, passage){
	//check to see if canonical name exists in DB
	db.findOne({title: passage.title}, function(err, result){
		
		if(result){
			log.info("pushing '"+query+"' into query list for "+result.title);
			
			//add the query to the query list for that passage
			db.update({title: passage.title}, {$push: {queries: query} }, {} );	
		}
		else{
			//save new db entry
			db.insert({
				title: passage.title,
				text: passage.text,
				next: passage.next,
				prev: passage.prev,
				queries: [passage.title, query],
				views: 1
			},
			function(err,newPassage){
			
				if (err) 
					log.err(err);
				else
					log.info("new passage saved to db: "+passage.title);
			});
		}
	});
}

async function getRandomProverb(){ //get a random proverb
	
	return new Promise((resolve, reject)=>{

		const proverbList={ //number of verses in each chapter
			1:33,
			2:22,
			3:35,
			4:27,
			5:23,
			6:35,
			7:27,
			8:36,
			9:18,
			10:32,
			11:31,
			12:28,
			13:25,
			14:35,
			15:33,
			16:33,
			17:28,
			18:24,
			19:28,
			20:30,
			21:31,
			22:29,
			23:35,
			24:34,
			25:28,
			26:28,
			27:27,
			28:28,
			29:27,
			30:33,
			31:9 //leave out the wife of noble character part, since it's not very aphoristic
		};
		var ch = getRandomInt(1, 31+1); //random chapter
		var vs = getRandomInt(1, proverbList[ch]+1); //random verse
		
		if (ch<10)
		ch = "0"+ch;
		if (vs<10)
		vs = "0"+vs;
		
		var query = "200"+ch+"0"+vs;
		
		//check DB for query
		provDB.findOne({query: query}, async(err, result)=>{
			
			if(result){ //if in db
				log.info('found proverb in db')
				resolve(result);
				return;
			}
			
			//query esv api for verse
			var options = {
				url: 'https://api.esv.org/v3/passage/text/?q='+query+'&include-passage-references=false&include-first-verse-numbers=false&include-verse-numbers=false&include-footnotes=false&include-footnote-body=false&include-passage-horizontal-lines=false&include-heading-horizontal-lines=false&include-headings=false&include-selahs=false&indent-paragraphs=0&indent-poetry=false&indent-poetry-lines=0&indent-psalm-doxology=0',
				headers: { Accept: 'application/json', Authorization: AUTH_TOKEN }
			};
			
			var proverb = await getFromESV(query, options).catch(log.err);
			
			if(!proverb){//if no result
				reject('proverb not found');
				return;
			}
			
			var cleanText = result.text.replace('\n',' ').replace('(ESV)','');
			
			var output = {
				title: result.title,
				text: cleanText,
				query: query
			};
			
			//send back result
			resolve(output);	
			log.info("saving to DB: "+output.title)
			provDB.insert(output);
		});	
	});
}

async function getFromESV(query, options){
	return new Promise(async (resolve, reject)=>{
		log.info("getting data from ESV for: "+query);
		options = options || {
		  url: 'https://api.esv.org/v3/passage/html/?q='+query+'&wrapping-div=true&div-classes=esv-text&include-footnotes=false&include-audio-link=false',
		  headers: { Accept: 'application/json',	Authorization: AUTH_TOKEN  }
		};
		
		var esvResponse = await request(options).catch(log.err);
		if(!esvResponse){
			reject('no ESV response');
			return;
		}
		esvResponse = JSON.parse(esvResponse);
			
		if(esvResponse.canonical=="" && !esvResponse.passages.length){ //if no result
			reject("no passages returned from ESV");
			return;
		}

		let result={
			title: esvResponse.canonical,
			text: esvResponse.passages.join(' '),
			next: esvResponse.passage_meta[0].next_chapter ? esvResponse.passage_meta[0].next_chapter.join('-') : '',
			prev: esvResponse.passage_meta[0].prev_chapter ? esvResponse.passage_meta[0].prev_chapter.join('-') : '',
		};	
		resolve(result);
		updateDB(query, result);
	});
}

function test(query){
	exports.get(query).then(function(result){ console.log(result); });
}
//test("jn 1.6");

function list(){
	db.find({}, function(err, results){
		for (result of results){
			console.log(result.title, result.queries);	
		}
	});
}
//list();

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}