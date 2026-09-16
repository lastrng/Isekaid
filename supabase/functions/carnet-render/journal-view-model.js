const PREFECTURES={tokyo:"Tokyo",kyoto:"Kyoto",osaka:"Osaka",nara:"Nara",hiroshima:"Hiroshima",kanagawa:"Kanagawa",ishikawa:"Ishikawa",gifu:"Gifu",shizuoka:"Shizuoka"};

function isoDay(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||""))?String(value):null;}
function addDays(iso,count){const date=new Date(`${iso}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+count);return date.toISOString().slice(0,10);}
function normalizePhotos(activity){
  const photos=Array.isArray(activity?.memoryPhotos)?activity.memoryPhotos:activity?.memoryPhoto?[{id:`legacy-${activity.id}`,storagePath:activity.memoryPhoto,isCover:true,sortOrder:0}]:[];
  return photos.filter(photo=>photo?.storagePath&&!photo.storagePath.startsWith("data:")&&photo.status!=="pending").sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)).map((photo,index)=>({id:photo.id||`${activity.id}-${index}`,storagePath:photo.storagePath,caption:String(photo.caption||"").slice(0,500),isCover:Boolean(photo.isCover),takenAt:photo.takenAt||null,width:photo.width||null,height:photo.height||null}));
}
function tripDate(trip,day,index){return isoDay(day?.date)||isoDay(trip?.dateDebut)&&addDays(trip.dateDebut,index)||null;}
function titleCase(value){return String(value||"").replace(/[-_]/g," ").replace(/(^|\s)\p{L}/gu,letter=>letter.toUpperCase());}
function firstSentence(value){const clean=String(value||"").trim();if(!clean)return null;return clean.split(/(?<=[.!?])\s/)[0].slice(0,260);}

export function buildTravelJournalViewModel({trip,user,catalog,photoDataByPath={}}){
  const cityById=new Map((catalog?.cities||[]).map(city=>[city.id,city]));
  const placeById=new Map((catalog?.places||[]).map(place=>[place.id,place]));
  const days=(trip?.jours||[]).map((day,index)=>{
    const city=cityById.get(day.villeId)||{id:day.villeId,nom:titleCase(day.villeId),nom_jp:""};
    const activities=(day.activites||[]).filter(activity=>activity.fait===true).map(activity=>{
      const place=placeById.get(activity.lieuId)||{id:activity.lieuId,nom:"Lieu visité",nom_jp:"",quartier:"",description:""};
      const photos=normalizePhotos(activity).map(photo=>({...photo,dataUrl:photoDataByPath[photo.storagePath]||null}));
      return {id:activity.id,placeId:activity.lieuId,name:place.nom||"Lieu visité",nameJa:place.nom_jp||"",district:place.quartier||"",category:place.categorie||"",time:activity.heure||"",note:String(activity.note||"").trim().slice(0,3000),fact:firstSentence(place.description),photos};
    });
    const photos=activities.flatMap(activity=>activity.photos.map(photo=>({...photo,placeName:activity.name})));
    return {number:day.num||index+1,date:tripDate(trip,day,index),cityId:city.id,city:city.nom||titleCase(city.id),cityJa:city.nom_jp||"",title:String(day.titre||"").trim(),activities,photos,notes:activities.filter(activity=>activity.note).map(activity=>({place:activity.name,text:activity.note})),fact:activities.map(activity=>activity.fact).find(Boolean)||null};
  });
  const destinations=[];
  for(const day of days){
    const current=destinations[destinations.length-1];
    if(current?.id===day.cityId)current.dayNumbers.push(day.number);
    else destinations.push({id:day.cityId,name:day.city,nameJa:day.cityJa,dayNumbers:[day.number]});
  }
  const photos=days.flatMap(day=>day.photos);
  const cover=photos.find(photo=>photo.isCover&&photo.dataUrl)||photos.find(photo=>photo.dataUrl)||null;
  const visitedPlaces=new Set(days.flatMap(day=>day.activities.map(activity=>activity.placeId)).filter(Boolean));
  const prefectures=[...new Set(destinations.map(destination=>{
    const city=cityById.get(destination.id);
    return city?.prefectureId||String(city?.prefecture||destination.id).toLowerCase();
  }).filter(Boolean))];
  const stamps=[...destinations.map(destination=>({id:`city:${destination.id}`,label:destination.name,mark:destination.nameJa||destination.name})),...prefectures.map(id=>({id:`prefecture:${id}`,label:PREFECTURES[id]||titleCase(id),mark:"訪問"})),{id:`trip:${trip.id}`,label:"Voyage accompli",mark:"旅"}];
  const traveler=String(user?.user_metadata?.full_name||user?.user_metadata?.name||user?.email?.split("@")[0]||"Voyageur").slice(0,100);
  return {
    version:1,
    trip:{id:trip.id,title:String(trip.titre||"Mon voyage au Japon").slice(0,180),startDate:isoDay(trip.dateDebut)||days[0]?.date||null,endDate:isoDay(trip.dateFin)||days.at(-1)?.date||null},
    traveler,
    destinations,
    days,
    cover,
    stamps,
    statistics:{days:days.length,visitedPlaces:visitedPlaces.size,prefectures:prefectures.length,photos:photos.filter(photo=>photo.dataUrl).length,stamps:stamps.length},
  };
}

export function journalSourcePayload(trip){
  return {id:trip.id,titre:trip.titre,dateDebut:trip.dateDebut,dateFin:trip.dateFin,status:trip.status,completedAt:trip.completedAt,villes:trip.villes,jours:(trip.jours||[]).map(day=>({num:day.num,date:day.date,villeId:day.villeId,titre:day.titre,activites:(day.activites||[]).filter(activity=>activity.fait===true).map(activity=>({id:activity.id,lieuId:activity.lieuId,heure:activity.heure,note:activity.note,memoryPhoto:activity.memoryPhoto,memoryPhotos:activity.memoryPhotos}))}))};
}
