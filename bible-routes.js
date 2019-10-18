const express = require('express');
const router = express.Router();
const bible = require('./bible.js');
const roa = require('./roa.js');

//render random proverb
router.get('/rp', async(req, res, next)=> {
	rand = getRandomInt(0,100);
	if(rand<5){
		rule = roa.randomRule();
		res.render('collect', {title: "Rule of Acquisition Number "+ rule.Number, text: rule.Rule});
	}
	else{
		var prov = await bible.getRandomProverb();
		res.render('collect', prov);
	}
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

//bible json
router.get('/api/:query?', function(req, res, next) {
	
	if(!req.params.query)
		res.send({title: "Bible", text:""});
	else
		bible.get(req.params.query).then(function(response){
			res.send(response);
		});
});



//proverb json
router.get('/api/rp', function(req, res, next) {
  var rand = getRandomInt(0,100);
  if(rand<5){
		rule = roa.randomRule();
	   res.status(200).send({reference: "Rule of Acquisition Number "+ rule.Number, text: rule.Rule});
  }
  else{
	bible.getRandomProverb(function(response){
		res.status(200).send({reference: response.title, text: response.text});
	});
  }
});
router.get('/roa', function(req, res, next) {

	rule = roa.randomRule();
	res.render('collect', {title: "Rule of Acquisition Number "+ rule.Number, text: rule.Rule});

});

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

module.exports = router;
