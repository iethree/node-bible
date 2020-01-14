//bible-client.js

var recent=[];
const recentlimit = 8;
const dayColor = "#e8eaed";
const nightColor = "#2D2E30";

handleRecent();
checkNight();

function handleRecent(){
	
	//load recent searches
	if (localStorage.recent)
		recent = JSON.parse(localStorage.recent);
	
	//if there is valid text displayed, save it
	var passageTitles = document.querySelectorAll('.extra_text');
	if(passageTitles.length)
	{
		var querytext='';
			
		for(let i of passageTitles)
			querytext+=i.innerText+", ";

		querytext=querytext.slice(0,-2);
		
		if (recent.indexOf(querytext)<0) //save it if it's new
			recent.unshift(querytext);
		
		if(recent.length>recentlimit)
			recent.pop();
		
		localStorage.setItem("recent",JSON.stringify(recent));
	}
	
	//if there is saved data, and it's a blank page, show recent texts
	if(recent.length && document.getElementById("recent")){
		output = '';
		
		for (cnt=0;cnt<recent.length; cnt++){
			output+=`<p class='control'>
				<a class='button recent-item' href='${searchFriendly(recent[cnt])}'>${recent[cnt]}</a>
			</p>`;
		}

		document.getElementById("recent").innerHTML=output;
		var recentButtons = document.querySelectorAll(".recent-item");
		for (let i of recentButtons)
			i.addEventListener('click', (e)=>{e.preventDefault(); search(e.target.getAttribute('href'));});
	}
}

//search button handler
document.getElementById("search").addEventListener( "click", ()=>search(document.getElementById("get").value)); 

document.getElementById('get').addEventListener('keyup', (e)=>{
	if (e.keyCode == 13) { //if user hits enter, search
		search(document.getElementById("get").value);
	}
});

function search(query){
	if(!query || query==='/')
		return;
	document.getElementById("loader").classList.add("loader");
	//check localcache
	var cache = cacheLoad();
	var result = cacheCheck(cache, query);
	if(result){
		writePassage(result);
		handleRecent();
		return;
	}

	//get from api
	fetch("/api/"+query)
	.then(r=>r.json())
	.then(r=>{
		writePassage(r);
		cachePush(cache, r);
		handleRecent();
	});
}

function writePassage(r){
	window.history.pushState("object or string", r.title, "/"+r.title.replace(/\s/g,''));
	document.title = r.title;
	document.getElementById("bible-content").innerHTML = r.text;
	document.querySelector(".lastCH").setAttribute('href', r.prev);
	document.querySelector(".nextCH").setAttribute('href', r.next);
	document.getElementById("loader").classList.remove("loader");
	window.scroll(0,100);
	
}

//share button handler
var shareButton = document.getElementById("shareButton");
if(shareButton)
	shareButton.addEventListener('click', share);

//night button handler
var nightButton = document.getElementById('toggle-night');
if (nightButton)
	nightButton.addEventListener('click', toggleNight);

//next/previous handlers
var lastButton = document.querySelector('.lastCH');
if(lastButton)
	lastButton.addEventListener('click', (e)=>{e.preventDefault(); search(lastButton.getAttribute('href')); } );
var nextButton = document.querySelector('.nextCH')
if(nextButton)
	nextButton.addEventListener('click', (e)=>{e.preventDefault(); search(nextButton.getAttribute('href')); } );

function share(){
	if (navigator.share) { //mobile android only
	  navigator.share({
		  title: document.title,
		  url: document.URL,
	  })
		.then(() => {
			console.log('Successful share'); 
			document.getElementById("shareButton").innerHTML='<i class = "fas fa-check"></i>';
		})
		.catch((error) => console.log('Error sharing', error));
	}
	else{//clipboard for everyone else
		var temp = document.createElement('input');
		document.body.append(temp);
		temp.value=document.title+" : "+document.URL;
		temp.select();
		document.execCommand("copy");
		temp.remove();
		 
		document.getElementById("shareButton").innerHTML = '(copied to clipboard)';
	}
};
		
function toggleNight(){
	document.body.classList.toggle('night');
	
	let night = localStorage.night==="false" ? true : false;
		
	toggleThemeColor();
	localStorage.setItem('night', night);
}

function checkNight(){
	if(localStorage.night==="true"){
		document.body.classList.add('night');
		toggleThemeColor();
	}
}

function toggleThemeColor(){
	themeColor = document.querySelector('meta[name="theme-color"]');
	if(themeColor.getAttribute('content')===nightColor)
		themeColor.setAttribute('content', dayColor);
	else
		themeColor.setAttribute('content', nightColor);
}

//local cache functions
function cachePush(cache, passage){
	cache.unshift(passage);
	if(cache.length>50)
		cache.pop();
	localStorage.setItem('cache', JSON.stringify(cache)); //side effect
	return cache;
}
function cacheLoad(){
	var cache = localStorage.cache;
	if(cache)
		cache = JSON.parse(cache);
	else
		cache = [];
	return cache;
}
function cacheCheck(cache, title){
	title = searchFriendly(title);
	for(i of cache){
		if(searchFriendly(i.title) === title)
			return i;
	}
	return false;
}

function searchFriendly(query){
	return query.toLowerCase().replace(/\s/g,'');
}

