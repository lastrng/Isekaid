async function listStorageTree(bucket, prefix) {
  const files=[];
  let offset=0;
  const seenPages=new Set();
  while(true){
    const {data,error}=await bucket.list(prefix,{limit:100,offset,sortBy:{column:"name",order:"asc"}});
    if(error)throw error;
    if(!data?.length)break;
    const signature=data.map(item=>`${item.name}:${item.id||"folder"}`).join("|");
    // Defensive fallback for storage adapters that ignore `offset`: return the
    // page already collected so the caller can delete it, then list again.
    if(seenPages.has(signature))break;
    seenPages.add(signature);
    for(const item of data){
      const path=`${prefix}/${item.name}`;
      if(item.id||item.metadata||/\.[a-z0-9]+$/i.test(item.name))files.push(path);
      else files.push(...await listStorageTree(bucket,path));
    }
    if(data.length<100)break;
    offset+=data.length;
  }
  return files;
}

export async function removeAccountStorageTree(storage, bucketName, userId) {
  const bucket=storage.from(bucketName);
  while(true){
    const files=await listStorageTree(bucket,userId);
    if(!files.length)break;
    for(let index=0;index<files.length;index+=100){
      const {error}=await bucket.remove(files.slice(index,index+100));
      if(error)throw error;
    }
  }
}

export function removeAccountMemoryPhotos(storage,userId) {
  return removeAccountStorageTree(storage,"memory-photos",userId);
}

export function removeAccountTravelJournals(storage,userId) {
  return removeAccountStorageTree(storage,"travel-journals",userId);
}
