//bible-client.js

var recent=[];
const recentlimit = 8;
handleRecent();

function handleRecent(){
	
	//load recent searches
	if (localStorage.recent)
		recent = JSON.parse(localStorage.recent);
	
	//if there is valid text displayed, save it
	var passageTitles = document.querySelectorAll('.extra_text');
	if(passageTitles.length)
	{
		var querytext='';
		console.log(passageTitles);
			
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
			output+="<p class='control'><a class='button' href='/"+recent[cnt]+"'>"+recent[cnt]+"</a></p>";
		}

		document.getElementById("recent").innerHTML=output;
	}
}

document.getElementById("search").addEventListener( "click", search); 

document.getElementById('get').addEventListener('keyup', (e)=>{
	if (e.keyCode == 13) { //if user hits enter, search
		search();
	}
});

function search(){
	document.getElementById("loader").classList.add("loader");
	
	query = document.getElementById("get").value;
	window.location.replace("/"+query);
}
//share button handler
var shareButton = document.getElementById("shareButton");
if(shareButton)
	shareButton.addEventListener('click', share);
var nightButton = document.getElementById('toggle-night');
if (nightButton)
	nightButton.addEventListener('click', toggleNight);

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
	let night = false;
	if(localStorage.night==="true")
		night = true;
		
	localStorage.setItem('night', !night);
}

function checkNight(){
	if(localStorage.night==="true")
		document.body.classList.add('night');
}
checkNight();
