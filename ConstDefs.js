const POWER_OFFSET = 31;
const REVERSE_POWER_OFFSET = 32 - POWER_OFFSET;

const SIDE_LENGTH_POWER = 6;
const SIDE_LENGTH = 2 ** SIDE_LENGTH_POWER;
const SIDE_LENGTH_SQUARED = SIDE_LENGTH ** 2;

let LOAD_DISTANCE = 6;
let UNLOAD_DISTANCE = 7;
let VIRTUAL_LOAD_DISTANCE = 4;
let VIRTUAL_UNLOAD_DISTANCE = 6;
//The reason for the virtual distances being 1 lower is
//because the outer layer of normal regions doesn't get
//rendered due to the neighbouring regions being unloaded.

const VIRTUAL_REGION_MESH_BORDER_PATCHER_TOLERANCE = 3;
const VRMBPT = VIRTUAL_REGION_MESH_BORDER_PATCHER_TOLERANCE;

const VIRTUAL_REGION_DEPTHS = 7;


let TEXTURE_SIZE = 16;
let TEXTURE_MAP_WIDTH = 256;
let TEXTURE_MAP_HEIGHT = 256;


const DEBUG_LEVELS = {
	"ALL": 0,
	"DEBUGGER": 1,
	"VERBOSE": 2,
	"DEBUG": 3,
	"TESTING": 4,
	"INFO": 5,
	"WARNING": 6,
	"ERROR": 7
};

let DEBUG_LEVEL = DEBUG_LEVELS.VERBOSE;
