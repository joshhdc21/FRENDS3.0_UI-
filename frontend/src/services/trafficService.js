const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_API_KEY;


console.log("TomTom Key:", TOMTOM_KEY);



const roads = [

  {
    name:"EDSA Cubao",
    point:"14.6170,121.0480"
  },

  {
    name:"C5 Katipunan",
    point:"14.6250,121.0700"
  },

  {
    name:"Commonwealth Avenue",
    point:"14.6680,121.0730"
  },

  {
    name:"Quezon Avenue",
    point:"14.6390,121.0330"
  },

  {
    name:"España Boulevard",
    point:"14.6078,120.9878"
  },

  {
    name:"Taft Avenue",
    point:"14.5720,120.9868"
  },

  {
    name:"Ortigas Avenue",
    point:"14.5860,121.0610"
  },

  {
    name:"Roxas Boulevard",
    point:"14.5480,120.9820"
  },

  {
    name:"Shaw Boulevard",
    point:"14.5810,121.0530"
  },

  {
    name:"SLEX Magallanes",
    point:"14.5400,121.0190"
  }

];



function getTrafficStatus(congestion){

  if(congestion < 30)
    return "Light";

  if(congestion < 60)
    return "Moderate";

  if(congestion < 80)
    return "Heavy";

  return "Severe";

}




async function getRoadTraffic(road){

  const url =
  `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${road.point}&key=${TOMTOM_KEY}`;


  const response = await fetch(url);


  const data = await response.json();



  if(!data.flowSegmentData){

    return {

      name:road.name,

      congestion:0,

      status:"Unavailable"

    };

  }



  const {
    currentSpeed,
    freeFlowSpeed

  } = data.flowSegmentData;



  const congestion = Math.round(

    ((freeFlowSpeed-currentSpeed)
    /
    freeFlowSpeed)
    *100

  );



  return {

    name:road.name,

    congestion:Math.max(
      0,
      congestion
    ),

    status:getTrafficStatus(
      Math.max(0, congestion)
    )

  };


}




export async function fetchTrafficData(){


try{


const results = await Promise.all(

roads.map(getRoadTraffic)

);



const validRoads =
results.filter(
r=>r.status !== "Unavailable"
);



const average =
Math.round(

validRoads.reduce(
(sum,r)=>sum+r.congestion,
0
)
/validRoads.length

);



return {

city:"Metro Manila",

congestion:average,

status:getTrafficStatus(
average
),

peak:"5:00 PM - 8:00 PM",

roads:results

};



}catch(error){


console.error(
"Traffic Error:",
error
);



return {

city:"Metro Manila",

congestion:0,

status:"Unavailable",

peak:"--",

roads:[]

};


}



}