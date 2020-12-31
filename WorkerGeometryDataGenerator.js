importScripts("ConstDefs.js");
const GEOMETRY_FACES = [
  {
    "Direction": [-1, 0, 0],//Left
    "Corners": [
      { "Position": [ 0, 1, 0 ], "UV": [ 0, 1 ] },
      { "Position": [ 0, 0, 0 ], "UV": [ 0, 0 ] },
      { "Position": [ 0, 1, 1 ], "UV": [ 1, 1 ] },
      { "Position": [ 0, 0, 1 ], "UV": [ 1, 0 ] }
    ]
  },
  {
    "Direction": [1, 0, 0],//Right
    "Corners": [
      { "Position": [ 1, 1, 1 ], "UV": [ 0, 1 ] },
      { "Position": [ 1, 0, 1 ], "UV": [ 0, 0 ] },
      { "Position": [ 1, 1, 0 ], "UV": [ 1, 1 ] },
      { "Position": [ 1, 0, 0 ], "UV": [ 1, 0 ] }
    ]
  },
  {
    "Direction": [0, -1, 0],//Bottom
    "Corners": [
      { "Position": [ 1, 0, 1 ], "UV": [ 1, 0 ] },
      { "Position": [ 0, 0, 1 ], "UV": [ 0, 0 ] },
      { "Position": [ 1, 0, 0 ], "UV": [ 1, 1 ] },
      { "Position": [ 0, 0, 0 ], "UV": [ 0, 1 ] }
    ]
  },
  {
    "Direction": [0, 1, 0],//Top
    "Corners": [
      { "Position": [ 0, 1, 1 ], "UV": [ 1, 1 ] },
      { "Position": [ 1, 1, 1 ], "UV": [ 0, 1 ] },
      { "Position": [ 0, 1, 0 ], "UV": [ 1, 0 ] },
      { "Position": [ 1, 1, 0 ], "UV": [ 0, 0 ] }
    ]
  },
  {
    "Direction": [0, 0, -1],//Back
    "Corners": [
      { "Position": [ 1, 0, 0 ], "UV": [ 0, 0 ] },
      { "Position": [ 0, 0, 0 ], "UV": [ 1, 0 ] },
      { "Position": [ 1, 1, 0 ], "UV": [ 0, 1 ] },
      { "Position": [ 0, 1, 0 ], "UV": [ 1, 1 ] }
    ]
  },
  {
    "Direction": [0, 0, 1],//Front
    "Corners": [
      { "Position": [ 0, 0, 1 ], "UV": [ 0, 0 ] },
      { "Position": [ 1, 0, 1 ], "UV": [ 1, 0 ] },
      { "Position": [ 0, 1, 1 ], "UV": [ 0, 1 ] },
      { "Position": [ 1, 1, 1 ], "UV": [ 1, 1 ] }
    ]
  }
];

self.onmessage = function(Event){
  self[Event.data.Request]?.(Event.data);
}

let AbortList = [];
function Abort(Data){
  delete Data.Request;
  if(AbortList.length > 1000) AbortList = [];
  AbortList.push({Data});
}

function MergeTypedArrays(...Arrays){
  let MergedArrayLength = 0;
  for(let i = 0, Length = Arrays.length; i < Length; i++) MergedArrayLength += Arrays[i].length || 0;
  let MergedArray = new Arrays[0].constructor(MergedArrayLength);
  let DataPositions = new Uint32Array(Arrays.length);
  for(let i = 0, Stride = 0, Length = Arrays.length; i < Length; i++){
    MergedArray.set(Arrays[i], Stride);
    DataPositions[i] = Stride;
    Stride += Arrays[i].length || 0;
  }
  return [MergedArray, DataPositions];
}

function IsOccluded(RegionP00, RegionM00, Region0P0, Region0M0, Region00P, Region00M){
  const SIDE_LENGTH_MINUS_ONE = SIDE_LENGTH - 1;
  for(let Y = 0; Y < SIDE_LENGTH; Y++) for(let Z = 0; Z < SIDE_LENGTH; Z++) if(IsTransparent(GetVoxelFromRelativeRegionData(0, Y, Z, RegionP00))) return false;
  for(let X = 0; X < SIDE_LENGTH; X++) for(let Z = 0; Z < SIDE_LENGTH; Z++) if(IsTransparent(GetVoxelFromRelativeRegionData(X, 0, Z, Region0P0))) return false;
  for(let X = 0; X < SIDE_LENGTH; X++) for(let Y = 0; Y < SIDE_LENGTH; Y++) if(IsTransparent(GetVoxelFromRelativeRegionData(X, Y, 0, Region00P))) return false;
  //for(let Y = 0; Y < SIDE_LENGTH; Y++) for(let Z = 0; Z < SIDE_LENGTH; Z++) if(IsTransparent(GetVoxelFromRelativeRegionData(SIDE_LENGTH_MINUS_ONE, Y, Z, RegionM00))) return false;
  //for(let X = 0; X < SIDE_LENGTH; X++) for(let Z = 0; Z < SIDE_LENGTH; Z++) if(IsTransparent(GetVoxelFromRelativeRegionData(X, SIDE_LENGTH_MINUS_ONE, Z, Region0M0))) return false;
  //for(let X = 0; X < SIDE_LENGTH; X++) for(let Y = 0; Y < SIDE_LENGTH; Y++) if(IsTransparent(GetVoxelFromRelativeRegionData(X, Y, SIDE_LENGTH_MINUS_ONE, Region00M))) return false;
  return true;
}
function IsSemiOccluded(RegionP00, RegionM00, Region0P0, Region0M0, Region00P, Region00M){
  const SIDE_LENGTH_MINUS_ONE = SIDE_LENGTH - 1;
  for(let Y = 0; Y < SIDE_LENGTH; Y++) for(let Z = 0; Z < SIDE_LENGTH; Z++) if(IsFullyTransparent(GetVoxelFromRelativeRegionData(0, Y, Z, RegionP00))) return false;
  for(let X = 0; X < SIDE_LENGTH; X++) for(let Z = 0; Z < SIDE_LENGTH; Z++) if(IsFullyTransparent(GetVoxelFromRelativeRegionData(X, 0, Z, Region0P0))) return false;
  for(let X = 0; X < SIDE_LENGTH; X++) for(let Y = 0; Y < SIDE_LENGTH; Y++) if(IsFullyTransparent(GetVoxelFromRelativeRegionData(X, Y, 0, Region00P))) return false;
  //for(let Y = 0; Y < SIDE_LENGTH; Y++) for(let Z = 0; Z < SIDE_LENGTH; Z++) if(IsSemiTransparent(GetVoxelFromRelativeRegionData(SIDE_LENGTH_MINUS_ONE, Y, Z, RegionM00))) return false;
  //for(let X = 0; X < SIDE_LENGTH; X++) for(let Z = 0; Z < SIDE_LENGTH; Z++) if(IsSemiTransparent(GetVoxelFromRelativeRegionData(X, SIDE_LENGTH_MINUS_ONE, Z, Region0M0))) return false;
  //for(let X = 0; X < SIDE_LENGTH; X++) for(let Y = 0; Y < SIDE_LENGTH; Y++) if(IsSemiTransparent(GetVoxelFromRelativeRegionData(X, Y, SIDE_LENGTH_MINUS_ONE, Region00M))) return false;
  return true;
}

function IsTransparent(ID){ //For opaque blocks
  return IsFullyTransparent(ID) || IsSemiTransparent(ID);
}
function IsFullyTransparent(ID){ //For liquids
  return ID === 0;
}
function IsSemiTransparent(ID){ //For liquids
  return ID === 4;
}

function GetVoxelFromRelativeRegionData(rX, rY, rZ, Region){
  if(Region.Data === undefined) return Region.CommonBlock ?? 0;
  return Region.Data[rX * SIDE_LENGTH_SQUARED + rY * SIDE_LENGTH + rZ];
}

function GenerateGeometryData(Data){
  if(Data.StopState[0] !== 0){
    //Send message back to kill region
    console.error("Test");
    return;
  }
  const RegionX = (Data.URegionX << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  const RegionY = (Data.URegionY << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  const RegionZ = (Data.URegionZ << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  const URegionX = Data.URegionX;
  const URegionY = Data.URegionY;
  const URegionZ = Data.URegionZ;
  const SIDE_LENGTH = Data.SideLength;
  const SIDE_LENGTH_MINUS_ONE = SIDE_LENGTH - 1;
  const SIDE_LENGTH_SQUARED = SIDE_LENGTH ** 2;
  const SIDE_LENGTH_POWER = Math.log2(SIDE_LENGTH);
  const Regions = Data.RegionData;
  const CurrentRegion = Regions[URegionX + "," + URegionY + "," + URegionZ];
  const RegionP00 = Regions[((RegionX + 1) >>> 0) % (1 << POWER_OFFSET) + "," + URegionY + "," + URegionZ];
  const RegionM00 = Regions[((RegionX - 1) >>> 0) % (1 << POWER_OFFSET) + "," + URegionY + "," + URegionZ];
  const Region0P0 = Regions[URegionX + "," + ((RegionY + 1) >>> 0) % (1 << POWER_OFFSET) + "," + URegionZ];
  const Region0M0 = Regions[URegionX + "," + ((RegionY - 1) >>> 0) % (1 << POWER_OFFSET) + "," + URegionZ];
  const Region00P = Regions[URegionX + "," + URegionY + "," + ((RegionZ + 1) >>> 0) % (1 << POWER_OFFSET)];
  const Region00M = Regions[URegionX + "," + URegionY + "," + ((RegionZ - 1) >>> 0) % (1 << POWER_OFFSET)];
  //let [MergedRegionData, Positions] = MergeTypedArrays(CurrentRegion.Data, RegionP00.Data, RegionM00.Data, Region0P0.Data, Region0M0.Data, Region00P.Data, Region00M.Data);

  if(RegionP00.CommonBlock !== undefined) RegionP00.CommonBlock |= 0;
  if(RegionM00.CommonBlock !== undefined) RegionM00.CommonBlock |= 0;
  if(Region0P0.CommonBlock !== undefined) Region0P0.CommonBlock |= 0;
  if(Region0M0.CommonBlock !== undefined) Region0M0.CommonBlock |= 0;
  if(Region00P.CommonBlock !== undefined) Region00P.CommonBlock |= 0;
  if(Region00M.CommonBlock !== undefined) Region00M.CommonBlock |= 0;
  //^^ Might make a 1% performace difference, since it explicitly converts them to ints? Chromium is weird.

  const TextureSizeToMapWidthRatio = TEXTURE_SIZE / TEXTURE_MAP_WIDTH;
  const TextureSizetoMapHeightRatio = TEXTURE_SIZE / TEXTURE_MAP_HEIGHT;

  let Occluded = IsOccluded(RegionP00, RegionM00, Region0P0, Region0M0, Region00P, Region00M);
  let SemiOccluded = IsSemiOccluded(RegionP00, RegionM00, Region0P0, Region0M0, Region00P, Region00M);

  if(Occluded && SemiOccluded){
    self.postMessage({
      "Request": "SaveGeometryData",
      "URegionX": URegionX,
      "URegionY": URegionY,
      "URegionZ": URegionZ,
      "CommonBlock": Data.RegionData.CommonBlock,
      "Opaque":{
        "Positions": [],
        "Normals": [],
        "Indices": [],
        "UVs": []
      },
      "Transparent":{
        "Positions": [],
        "Normals": [],
        "Indices": [],
        "UVs": []
      }
    }); //No need to iterate.
    return;
  }
  //if(CurrentRegion.CommonBlock !== undefined);
  let OPositions = [], ONormals = [], OIndices = [], OUVs = [],
      TPositions = [], TNormals = [], TIndices = [], TUVs = [];

  for(let X = RegionX * SIDE_LENGTH, MaxX = (RegionX + 1) * SIDE_LENGTH, OCounter = 0, TCounter = 0, rX = 0; X < MaxX; X++, rX++){
    //let Edge = rX === 0 || rX === SIDE_LENGTH_MINUS_ONE;
    for(let Z = RegionZ * SIDE_LENGTH, MaxZ = (RegionZ + 1) * SIDE_LENGTH, rZ = 0; Z < MaxZ; Z++, rZ++){
      //Edge = Edge || rZ === 0 || rZ === SIDE_LENGTH_MINUS_ONE;
      for(let Y = RegionY * SIDE_LENGTH, MaxY = (RegionY + 1) * SIDE_LENGTH, rY = 0; Y < MaxY; Y++, rY++){
        //Edge = Edge || rY === 0 || rY === SIDE_LENGTH_MINUS_ONE;
        const Voxel = GetVoxelFromRelativeRegionData(rX, rY, rZ, CurrentRegion);
        if(Voxel){
          for(const {Direction, Corners} of GEOMETRY_FACES){

            let Neighbour;
            const drX = rX + Direction[0];
            const drY = rY + Direction[1];
            const drZ = rZ + Direction[2];
            /*if(drX === -1 || drY === -1 || drZ === -1 || drX === SIDE_LENGTH || drY === SIDE_LENGTH || drZ === SIDE_LENGTH){
              Neighbour = GetVoxel(drX + RegionX * SIDE_LENGTH, drY + RegionY * SIDE_LENGTH, drZ + RegionZ * SIDE_LENGTH);
            }*/
            if(drX === -1) Neighbour = GetVoxelFromRelativeRegionData(drX + SIDE_LENGTH, drY, drZ, RegionM00);
            else if(drX === SIDE_LENGTH) Neighbour = GetVoxelFromRelativeRegionData(0, drY, drZ, RegionP00);
            else if(drY === -1) Neighbour = GetVoxelFromRelativeRegionData(drX, drY + SIDE_LENGTH, drZ, Region0M0);
            else if(drY === SIDE_LENGTH) Neighbour = GetVoxelFromRelativeRegionData(drX, 0, drZ, Region0P0);
            else if(drZ === -1) Neighbour = GetVoxelFromRelativeRegionData(drX, drY, drZ + SIDE_LENGTH, Region00M);
            else if(drZ === SIDE_LENGTH) Neighbour = GetVoxelFromRelativeRegionData(drX, drY, 0, Region00P);
            else Neighbour = GetVoxelFromRelativeRegionData(drX, drY, drZ, CurrentRegion);

            if(Neighbour === Voxel) continue;

            if(IsTransparent(Neighbour)){ //Transparent, with or without texture
              const Ndx = OCounter;
                OCounter += 4;
              for(const {Position, UV} of Corners){
                OPositions.push(Position[0] + rX, Position[1] + rY, Position[2] + rZ);
                ONormals.push(...Direction);
                OUVs.push(((Voxel % 16) + UV[0]) * 16/256, 1-((Voxel >> 4) - UV[1]) * 16/256);
              }
              OIndices.push(Ndx, Ndx + 1, Ndx + 2, Ndx + 2, Ndx + 1, Ndx + 3);
            }
            else continue;

            if(Voxel === 4 && Neighbour === 0){
              const Ndx = TCounter;
                TCounter += 4;
              for(const {Position, UV} of Corners){
                TPositions.push(Position[0] + rX, Position[1] + rY, Position[2] + rZ);
                TNormals.push(...Direction);
                TUVs.push(((Voxel % 16) + UV[0]) * 16/256, 1-((Voxel >> 4) - UV[1]) * 16/256);
              }
              TIndices.push(Ndx, Ndx + 1, Ndx + 2, Ndx + 2, Ndx + 1, Ndx + 3);
            }
          }
        }
      }
    }
  }

  self.postMessage({
    "Request": "SaveGeometryData",
    "URegionX": URegionX,
    "URegionY": URegionY,
    "URegionZ": URegionZ,
    "CommonBlock": undefined,
    "Opaque":{
      "Positions": OPositions,
      "Normals": ONormals,
      "Indices": OIndices,
      "UVs": OUVs
    },
    "Transparent":{
      "Positions": TPositions,
      "Normals": TNormals,
      "Indices": TIndices,
      "UVs": TUVs
    }
  }); ///This could be inefficient because it copies the Positions, Normals and Indices arrays... Perhaps I could make them transferable?
}

function GenerateVirtualGeometryData(Data){
  if(Data.StopState[0] === 1){
    //Send message back to kill region
    console.error("Test");
    return;
  }
  const RegionX = (Data.URegionX << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  const RegionY = (Data.URegionY << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  const RegionZ = (Data.URegionZ << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  const URegionX = Data.URegionX;
  const URegionY = Data.URegionY;
  const URegionZ = Data.URegionZ;
  const SIDE_LENGTH = Data.SideLength;
  const SIDE_LENGTH_MINUS_ONE = SIDE_LENGTH - 1;
  const SIDE_LENGTH_SQUARED = SIDE_LENGTH ** 2;
  const SIDE_LENGTH_POWER = Math.log2(SIDE_LENGTH);
  const DEPTH = Data.Depth;
  const FACTOR = 2 ** (VIRTUAL_REGION_DEPTHS - Data.Depth);
  const SIDE_LENGTH_MULTIPLIED = SIDE_LENGTH * FACTOR;
  const CurrentRegion = Data.RegionData.Region;
  const HeightMap = Data.RegionData.HeightMap;


  const TextureSizeToMapWidthRatio = TEXTURE_SIZE / TEXTURE_MAP_WIDTH;
  const TextureSizetoMapHeightRatio = TEXTURE_SIZE / TEXTURE_MAP_HEIGHT;

  const GetVoxelFromRelativeRegionData = function(rX, rY, rZ, Region){
    //if(Region.Data === undefined) return Region.CommonBlock ?? 0; //Never happens.
    return Region[rX * SIDE_LENGTH_SQUARED + rY * SIDE_LENGTH + rZ];
  };

  //TODO: Water on virtual region borders still isn't being shown.
  //For the time being, the sea level is at -32.

  if(Data.RegionData.CommonBlock !== undefined){
    self.postMessage({
      "Request": "SaveVirtualGeometryData",
      "URegionX": URegionX,
      "URegionY": URegionY,
      "URegionZ": URegionZ,
      "Depth": DEPTH,
      "CommonBlock": Data.RegionData.CommonBlock,
      "Opaque":{
        "Positions": [],
        "Normals": [],
        "Indices": [],
        "UVs": []
      },
      "Transparent":{
        "Positions": [],
        "Normals": [],
        "Indices": [],
        "UVs": []
      }
    }); //No need to iterate.
    return;
  }
  //if(CurrentRegion.CommonBlock !== undefined);
  let OPositions = [], ONormals = [], OIndices = [], OUVs = [],
      TPositions = [], TNormals = [], TIndices = [], TUVs = [];

  for(let OCounter = 0, TCounter = 0, rX = 0, Stride = 0; rX < SIDE_LENGTH; rX++){
    for(let rZ = 0; rZ < SIDE_LENGTH; rZ++){
      let Height = HeightMap[Stride++];
      for(let rY = 0; rY < SIDE_LENGTH; rY++){
        const Voxel = GetVoxelFromRelativeRegionData(rX, rY, rZ, CurrentRegion);
        if(Voxel){
          for(const {Direction, Corners} of GEOMETRY_FACES){

            let Neighbour;
            let TransparentNeighbour = false;
            const drX = rX + Direction[0];
            const drY = rY + Direction[1];
            const drZ = rZ + Direction[2];
            if(drX === -1 || drY === -1 || drZ === -1 || drX === SIDE_LENGTH || drY === SIDE_LENGTH || drZ === SIDE_LENGTH){
              //VRMB Patcher
              if((
                  (drY === -1 && Height < VRMBPT && Height > -VRMBPT) ||
                  (drY === SIDE_LENGTH && Height < VRMBPT + SIDE_LENGTH && Height > -VRMBPT + SIDE_LENGTH)
                ) || (
                  (Height < drY + VRMBPT && Height > drY - VRMBPT) && ( //Opaque blocks
                    drX === -1 || drX === SIDE_LENGTH ||
                    drZ === -1 || drZ === SIDE_LENGTH
                  )
                )
              ){
                TransparentNeighbour = true;
              } else if(Voxel === 4){
                TransparentNeighbour = false;
              } else continue;
            }
            else Neighbour = GetVoxelFromRelativeRegionData(drX, drY, drZ, CurrentRegion);

            if(Neighbour === Voxel) continue;

            if(IsTransparent(Neighbour) || TransparentNeighbour){ //Transparent, with or without texture
              const Ndx = OCounter;
              OCounter += 4;
              for(const {Position, UV} of Corners){
                OPositions.push(Position[0] + rX, Position[1] + rY, Position[2] + rZ);
                ONormals.push(...Direction);
                OUVs.push(((Voxel % 16) + UV[0]) * 16/256, 1-((Voxel >> 4) - UV[1]) * 16/256);
              }
              OIndices.push(Ndx, Ndx + 1, Ndx + 2, Ndx + 2, Ndx + 1, Ndx + 3);
            }
            else continue;

            if(IsSemiTransparent(Voxel) && Neighbour === 0){
              const Ndx = TCounter;
              TCounter += 4;
              for(const {Position, UV} of Corners){
                TPositions.push(Position[0] + rX, Position[1] + rY, Position[2] + rZ);
                TNormals.push(...Direction);
                TUVs.push(((Voxel % 16) + UV[0]) * 16/256, 1-((Voxel >> 4) - UV[1]) * 16/256);
              }
              TIndices.push(Ndx, Ndx + 1, Ndx + 2, Ndx + 2, Ndx + 1, Ndx + 3);
            }
          }
        }
      }
    }
  }

  self.postMessage({
    "Request": "SaveVirtualGeometryData",
    "URegionX": URegionX,
    "URegionY": URegionY,
    "URegionZ": URegionZ,
    "Depth": DEPTH,
    "CommonBlock": undefined,
    "Opaque":{
      "Positions": OPositions,
      "Normals": ONormals,
      "Indices": OIndices,
      "UVs": OUVs
    },
    "Transparent":{
      "Positions": TPositions,
      "Normals": TNormals,
      "Indices": TIndices,
      "UVs": TUVs
    }
  }); ///This could be inefficient because it copies the Positions, Normals and Indices arrays... Perhaps I could make them transferable?
}
