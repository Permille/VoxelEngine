importScripts("ConstDefs.js");
importScripts("Simplex.js");

Noise.seed(17);

self.onmessage = function(Event){
  self[Event.data.Request]?.(Event.data);
}
let AbortList = [];
function Abort(Data){
  delete Data.Request;
  if(AbortList.length > 1000) AbortList = [];
  AbortList.push(Data);
  //debugger;
}
function GetHeight(X, Z){
  return (Noise.simplex2(X / 117, Z / 117) + 1) * Noise.simplex2(X / 37, Z / 37) * 5 + (Noise.simplex2(X / 44, Z / 44) + 1) * Noise.simplex2(X / 7, Z / 7) + Noise.simplex2(X / 512, Z / 512) * 55 + Noise.simplex2(X / 555, Z / 555) * 67 + Noise.simplex2(X / 1337, Z / 1337) * 210 + Noise.simplex2(X / 13000, Z / 13000) * 1355;
}
function GenerateRegionData(Data){
  if(Data.StopState[0] !== 0){
    //Send message back to kill region
    console.warn("Test");
    return;
  }
  //console.log(/*Data.URegionX + ", " + Data.URegionY + ", " + Data.URegionZ*/);
  const SIDE_LENGTH = Data.SideLength;
  const RegionX = (Data.URegionX << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  const RegionY = (Data.URegionY << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  const RegionZ = (Data.URegionZ << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  const SIDE_LENGTH_SQUARED = SIDE_LENGTH ** 2;
  const DataArray = Data.DataArray;
  let UniformType = undefined;
	for(let X = RegionX * SIDE_LENGTH, rX = 0, Stride = 0; rX < SIDE_LENGTH; X++, rX++){
    for(let Z = RegionZ * SIDE_LENGTH, rZ = 0; rZ < SIDE_LENGTH; Z++, rZ++){
      const Height = GetHeight(X, Z);
		  for(let Y = RegionY * SIDE_LENGTH, rY = 0; rY < SIDE_LENGTH; Y++, rY++){
				//let Height = (Math.sin(X / 37 * Math.PI * 2) + Math.sin(Z / 51 * Math.PI * 4)) * 5;
        //let Type = ~~(Height > Y);
        let Type;
        if(Height > Y) Type = Math.min(Math.max(((Height % 1) * Math.max(Y + 20, 0) / 50 + 1), 1), 3) >> 0;//(Math.random() * 15 + 241) >> 0;
        else{
          if(Height < -32 && Y < -32){
            Type = 4;
          } else{
            Type = 0;
          }
        }
        //TODO: Add a mesh that's specific for uniform region data when it's filled with water.
        if(UniformType !== false){
          if(UniformType === undefined) UniformType = Type;
          else if(Type !== UniformType) UniformType = false;
        }

				DataArray[/*Stride++*/rX * SIDE_LENGTH_SQUARED + rY * SIDE_LENGTH + rZ] = Type;
			}
		}
	}
  let LoadState = 0;
  let CommonBlock = undefined;
  if(UniformType !== false) LoadState = 11, CommonBlock = UniformType;
  else LoadState = 10;
  self.postMessage({
    "Request": "SaveRegionData",
    "URegionX": Data.URegionX,
    "URegionY": Data.URegionY,
    "URegionZ": Data.URegionZ,
    "RegionData": DataArray,
    "LoadState": LoadState,
    "CommonBlock": CommonBlock
  }/*, [DataArray.buffer]*/);
}

function GenerateVirtualRegionData(Data){
  if(Data.StopState[0] === 1){
    //Send message back to kill region
    console.warn("Test");
    return;
  }
  const SIDE_LENGTH = Data.SideLength;
  const Depth = Data.Depth;
  const RegionX = (Data.URegionX << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  const RegionY = (Data.URegionY << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  const RegionZ = (Data.URegionZ << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  const FACTOR = 2 ** (VIRTUAL_REGION_DEPTHS - Data.Depth);
  const SCALE = SIDE_LENGTH * FACTOR;
  const SIDE_LENGTH_SQUARED = SIDE_LENGTH ** 2;
  let DataArray = Data.DataArray;
  let HeightMap = Data.HeightMap;
  let UniformType = undefined;
  for(let X = RegionX * SCALE, rX = 0, Stride = 0; rX < SIDE_LENGTH; X += FACTOR, rX++){
    for(let Z = RegionZ * SCALE, rZ = 0; rZ < SIDE_LENGTH; Z += FACTOR, rZ++){
      const Height = GetHeight(X, Z);
      HeightMap[Stride++] = Math.min(Math.max((Height / FACTOR) - RegionY * SIDE_LENGTH, -128), 127);
		  for(let Y = RegionY * SCALE, rY = 0; rY < SIDE_LENGTH; Y += FACTOR, rY++){

        let Type;
        if(Height > Y) Type = Math.min(Math.max(((Height % 1) * Math.max(Y + 20, 0) / 50 + 1), 1), 3) >> 0;
        else{
          if(Height < -32 && Y < -32){
            Type = 4;
          } else{
            Type = 0;
          }
        }
        if(UniformType !== false){
          if(UniformType === undefined) UniformType = Type;
          else if(Type !== UniformType) UniformType = false;
        }

				DataArray[/*Stride++*/rX * SIDE_LENGTH_SQUARED + rY * SIDE_LENGTH + rZ] = Type;
			}
		}
	}
  let LoadState = 0;
  let CommonBlock = undefined;
  if(UniformType !== false) LoadState = 11, CommonBlock = UniformType;
  else LoadState = 10;
  self.postMessage({
    "Request": "SaveVirtualRegionData",
    "Depth": Depth,
    "URegionX": Data.URegionX,
    "URegionY": Data.URegionY,
    "URegionZ": Data.URegionZ,
    "RegionData": DataArray,
    "HeightMap": HeightMap,
    "LoadState": LoadState,
    "CommonBlock": CommonBlock
  });
}
