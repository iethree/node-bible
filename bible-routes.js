const express = require('express');
const router = express.Router();
const bible = require('./bible.js');
const roa = require('./roa.js');

//render random proverb
router.get('/rp', async(req, res, next)=> {
	rand = getRandomInt(0,100);
	if(rand<5){
		rule = roa.getRandomRule();
		res.render('collect', {title: "Rule of Acquisition Number "+ rule.Number, text: rule.Rule});
	}
	else{
		var prov = await bible.getRandomProverb();
		res.render('collect', prov);
	}
});

//random rule of acquisition
router.get('/roa', function(req, res, next) {

	rule = roa.getRandomRule();
	res.render('collect', {title: "Rule of Acquisition Number "+ rule.Number, text: rule.Rule});

});

//render bible
router.get('/:query?', async(req, res, next)=> {
	
	if(!req.params.query)
		res.render('bible',{title: "Bible", text:""});
	else{
		var passage = await bible.get(req.params.query);
		res.render('bible', passage);
	}
});


//proverb json
router.get('/api/rp', async (req, res, next)=>{
  var rand = getRandomInt(0,100);
  if(rand<5){ //5% chance to get a ferengi rule of acquisition instead of a proverb
		rule = roa.getRandomRule();
	   res.status(200).send({reference: "Rule of Acquisition Number "+ rule.Number, text: rule.Rule});
  }
  else{
	var prov = await bible.getRandomProverb();
	res.status(200).send({reference: prov.title, text: prov.text});

  }
});

//bible json
router.get('/api/:query?', function(req, res, next) {
	
	if(!req.params.query)
		res.send({title: "Bible", text:""});
	else
		bible.get(req.params.query).then(function(response){
			res.send(response);
		});
});


function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

module.exports = router;
