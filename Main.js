setTimeout(function(){Application.Initialise();}, 1);
class Application extends Listenable{
  static Version = "Alpha 0.1.4.5";
  static Build = "23";

  static Initialise(){
    //All dependencies will be loaded in script.js.
    setTimeout(function(){
      this.Listener = new Listenable;
      this.Keys = {};
      this.Main = new Main;
      this.Listener.FireEventListeners("PreInitEnd");
    }.bind(this), 0);
  }
}

class Main{
  constructor(){
    (DEBUG_LEVEL <= DEBUG_LEVELS.INFO) && console.time("Initialisation");
    this.Renderer = new Renderer;
    this.Game = new Game(this);
    this.PerformanceOverlay = new PerformanceOverlay;
    (DEBUG_LEVEL <= DEBUG_LEVELS.INFO) && console.timeEnd("Initialisation");
  }
}

class Renderer extends Listenable{
  static GeometryDataGenerator = class extends Listenable{
    constructor(Scene, World){
      super();
      this.Scene = Scene;
      this.World = World;
      this.World.WorldGenerator.AddEventListener("SaveVirtualRegionData", function(Event){
        this.GenerateVirtualGeometryDataFor(Event.data);
      }.bind(this));

      this.PendingAddGeometryDataRequests = 0;
      this.PendingAddVirtualGeometryDataRequests = 0;
      /*
        Only SaveVirtualRegionData will be listened to - for normal region data,
        the Region array will be iterated over, because the neighbouring regions
        would also need to be loaded.
        Making a queue would be a bad idea, because it's possible that the region
        gets deleted before it is able to be generated. As such, the original
        region array will be iterated over.
        If a generator for virtual region data needs more information, for example,
        to check whether a virtual region that's completely made up of water has
        air directly above it, a "NotEnoughData" event will be fired, specifying
        which virtual regions need to be included in the next call.
      */

      this.WorkerGeometryDataGenerator = new Worker(__ScriptPath__ + "/WorkerGeometryDataGenerator.js");

  		this.WorkerGeometryDataGenerator.addEventListener("error", function(e) {
  		    (DEBUG_LEVEL <= DEBUG_LEVELS.WARNING) && console.warn("Worker error:", e);
  		});
  		this.WorkerGeometryDataGenerator.addEventListener("messageerror", function(e) {
  		    (DEBUG_LEVEL <= DEBUG_LEVELS.WARNING) && console.warn("Message error:", e);
  		});
      this.WorkerGeometryDataGenerator.addEventListener("message", function(Event){
  			this.FireEventListeners(Event.data.Request, Event);
  		}.bind(this));


      this.AddEventListener("SaveGeometryData", function(Event){
        if(this.World.Regions[Event.data.URegionX + "," + Event.data.URegionY + "," + Event.data.URegionZ] === undefined) return;
        this.World.Regions[Event.data.URegionX + "," + Event.data.URegionY + "," + Event.data.URegionZ].LoadState = Region.LOAD_STATE_GENERATED_MESH;
        this.AddGeometryData({
          "Transparent": false,
          "Positions": Event.data.Opaque.Positions,
          "Normals": Event.data.Opaque.Normals,
          "Indices": Event.data.Opaque.Indices,
          "UVs": Event.data.Opaque.UVs,
          "URegionX": Event.data.URegionX,
          "URegionY": Event.data.URegionY,
          "URegionZ": Event.data.URegionZ,
          "CommonBlock": Event.data.CommonBlock,
          "TextureMap": Application.Main.Renderer.Textures.TextureMap
        }, function(Data, Mesh){
          this.World.Regions[Data.URegionX + "," + Data.URegionY + "," + Data.URegionZ].SetOpaqueMesh(Mesh);
        }.bind(this));
        this.AddGeometryData({
          "Transparent": true,
          "Positions": Event.data.Transparent.Positions,
          "Normals": Event.data.Transparent.Normals,
          "Indices": Event.data.Transparent.Indices,
          "UVs": Event.data.Transparent.UVs,
          "URegionX": Event.data.URegionX,
          "URegionY": Event.data.URegionY,
          "URegionZ": Event.data.URegionZ,
          "CommonBlock": Event.data.CommonBlock,
          "TextureMap": Application.Main.Renderer.Textures.TextureMap
        }, function(Data, Mesh){
          this.World.Regions[Data.URegionX + "," + Data.URegionY + "," + Data.URegionZ].SetTransparentMesh(Mesh);
        }.bind(this));
        (DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.debug("[" + (window.performance.now() >> 0) + "] Added transparent geometry data at " + Event.data.URegionX + ", " + Event.data.URegionY + ", " + Event.data.URegionZ);
      }.bind(this));

      this.AddEventListener("SaveVirtualGeometryData", function(Event){
        if(this.World.VirtualRegions[Event.data.Depth][Event.data.URegionX + "," + Event.data.URegionY + "," + Event.data.URegionZ] === undefined) return;
        this.AddVirtualGeometryData({
          "Transparent": false,
          "Positions": Event.data.Opaque.Positions,
          "Normals": Event.data.Opaque.Normals,
          "Indices": Event.data.Opaque.Indices,
          "UVs": Event.data.Opaque.UVs,
          "URegionX": Event.data.URegionX,
          "URegionY": Event.data.URegionY,
          "URegionZ": Event.data.URegionZ,
          "Depth": Event.data.Depth,
          "CommonBlock": Event.data.CommonBlock,
          "TextureMap": Application.Main.Renderer.Textures.TextureMap
        }, function(Data, Mesh){
          if(!Data.Empty) this.World.VirtualRegions[Data.Depth][Data.URegionX + "," + Data.URegionY + "," + Data.URegionZ].SetOpaqueMesh(Mesh);
          else this.World.VirtualRegions[Data.Depth][Data.URegionX + "," + Data.URegionY + "," + Data.URegionZ].SetOpaqueMesh(undefined);
        }.bind(this));
        this.AddVirtualGeometryData({
          "Transparent": true,
          "Positions": Event.data.Transparent.Positions,
          "Normals": Event.data.Transparent.Normals,
          "Indices": Event.data.Transparent.Indices,
          "UVs": Event.data.Transparent.UVs,
          "URegionX": Event.data.URegionX,
          "URegionY": Event.data.URegionY,
          "URegionZ": Event.data.URegionZ,
          "Depth": Event.data.Depth,
          "CommonBlock": Event.data.CommonBlock,
          "TextureMap": Application.Main.Renderer.Textures.TextureMap
        }, function(Data, Mesh){
          if(!Data.Empty) this.World.VirtualRegions[Data.Depth][Data.URegionX + "," + Data.URegionY + "," + Data.URegionZ].SetTransparentMesh(Mesh);
          else this.World.VirtualRegions[Data.Depth][Data.URegionX + "," + Data.URegionY + "," + Data.URegionZ].SetTransparentMesh(undefined);
        }.bind(this));
        (DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.debug("[" + (window.performance.now() >> 0) + "] Added virtual geometry data with depth " + Event.data.Depth + " at " + Event.data.URegionX + ", " + Event.data.URegionY + ", " + Event.data.URegionZ);
      }.bind(this));
    }
    GenerateMoreGeometryData(){
      const RegionArray = this.World.Regions;

  		for(const Identifier in RegionArray){

        const URegionX = RegionArray[Identifier].URegionX;
        const URegionY = RegionArray[Identifier].URegionY;
        const URegionZ = RegionArray[Identifier].URegionZ;

				const RegionX = (URegionX << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
				const RegionY = (URegionY << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
				const RegionZ = (URegionZ << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;

				const RegionM00 = RegionArray[(((RegionX - 1) >>> 0) % (1 << POWER_OFFSET)) + "," + URegionY + "," + URegionZ];
				const RegionP00 = RegionArray[(((RegionX + 1) >>> 0) % (1 << POWER_OFFSET)) + "," + URegionY + "," + URegionZ];
				const Region0M0 = RegionArray[URegionX + "," + (((RegionY - 1) >>> 0) % (1 << POWER_OFFSET)) + "," + URegionZ];
				const Region0P0 = RegionArray[URegionX + "," + (((RegionY + 1) >>> 0) % (1 << POWER_OFFSET)) + "," + URegionZ];
				const Region00M = RegionArray[URegionX + "," + URegionY + "," + (((RegionZ - 1) >>> 0) % (1 << POWER_OFFSET))];
				const Region00P = RegionArray[URegionX + "," + URegionY + "," + (((RegionZ + 1) >>> 0) % (1 << POWER_OFFSET))];
				const Region000 = RegionArray[URegionX + "," + URegionY + "," + URegionZ];

				///I could've just created a new array but that would still be as efficient as using the original array.
				//This way, I've stored the pointers in single variables so that they can be accessed more easily by the engine.

				if(!(
					RegionM00?.LoadState >= Region.LOAD_STATE_GENERATED_DATA &&
					RegionP00?.LoadState >= Region.LOAD_STATE_GENERATED_DATA &&
					Region0M0?.LoadState >= Region.LOAD_STATE_GENERATED_DATA &&
					Region0P0?.LoadState >= Region.LOAD_STATE_GENERATED_DATA &&
					Region00M?.LoadState >= Region.LOAD_STATE_GENERATED_DATA &&
					Region00P?.LoadState >= Region.LOAD_STATE_GENERATED_DATA &&
					Region000.LoadState < Region.LOAD_STATE_GENERATING_MESH
				)) continue;

				const RegionData = {
					[(((RegionX - 1) >>> 0) % (1 << POWER_OFFSET)) + "," + URegionY + "," + URegionZ]:{
						"Data": RegionM00?.Data,
						"CommonBlock": RegionM00?.CommonBlock
					},
					[(((RegionX + 1) >>> 0) % (1 << POWER_OFFSET)) + "," + URegionY + "," + URegionZ]:{
						"Data": RegionP00?.Data,
						"CommonBlock": RegionP00?.CommonBlock
					},
					[URegionX + "," + (((RegionY - 1) >>> 0) % (1 << POWER_OFFSET)) + "," + URegionZ]:{
  					"Data": Region0M0?.Data,
  					"CommonBlock": Region0M0?.CommonBlock
					},
					[URegionX + "," + (((RegionY + 1) >>> 0) % (1 << POWER_OFFSET)) + "," + URegionZ]:{
						"Data": Region0P0?.Data,
						"CommonBlock": Region0P0?.CommonBlock
					},
					[URegionX + "," + URegionY + "," + (((RegionZ - 1) >>> 0) % (1 << POWER_OFFSET))]:{
						"Data": Region00M?.Data,
						"CommonBlock": Region00M?.CommonBlock
					},
					[URegionX + "," + URegionY + "," + (((RegionZ + 1) >>> 0) % (1 << POWER_OFFSET))]:{
						"Data": Region00P?.Data,
						"CommonBlock": Region00P?.CommonBlock
					},
					[Identifier]:{
						"Data": Region000?.Data,
						"CommonBlock": Region000?.CommonBlock
					}
				};

				this.WorkerGeometryDataGenerator.postMessage({
					"Request": "GenerateGeometryData",
					"URegionX": URegionX,
					"URegionY": URegionY,
					"URegionZ": URegionZ,
					"SideLength": Region.SIDE_LENGTH,
					"RegionData": RegionData,
          "StopState": this.World.Regions[URegionX + "," + URegionY + "," + URegionZ].StopState
				});
				this.World.Regions[URegionX + "," + URegionY + "," + URegionZ].LoadState = Region.LOAD_STATE_GENERATING_MESH;
			}
    }
    GenerateVirtualGeometryDataFor(Data){
      this.WorkerGeometryDataGenerator.postMessage({
        "Request": "GenerateVirtualGeometryData",
        "Depth": Data.Depth,
        "URegionX": Data.URegionX,
        "URegionY": Data.URegionY,
        "URegionZ": Data.URegionZ,
        "SideLength": Region.SIDE_LENGTH,
        "RegionData": {
          "Region": Data.RegionData,
          "HeightMap": Data.HeightMap,
          "CommonBlock": Data.CommonBlock
        },
        "StopState": this.World.VirtualRegions[Data.Depth][Data.URegionX + "," + Data.URegionY + "," + Data.URegionZ].StopState
      });
      this.World.VirtualRegions[Data.Depth][Data.URegionX + "," + Data.URegionY + "," + Data.URegionZ].LoadState = Region.LOAD_STATE_GENERATING_MESH;
    }
    AddVirtualGeometryData(Data, Callback, ReCall = false, WaitingSince = window.performance.now()){
      const Identifier = Data.URegionX + "," + Data.URegionY + "," + Data.URegionZ;
      let VirtualRegion = this.World.VirtualRegions[Data.Depth][Identifier];
      if(VirtualRegion === undefined) return;
      if(Data.Positions.length === 0 || Data.Normals.length === 0 || Data.Indices.length === 0 || Data.UVs.length === 0){
        Data.Empty = true;
        return Callback(Data, undefined);
      }

      /*if(VirtualRegion.StopState[0] === 1){
        VirtualRegion.Destruct();
        delete this.World.VirtualRegions[Data.Depth][Identifier];
        if(ReCall) this.PendingAddVirtualGeometryDataRequests--;
        return;
      }*/

      if(window.performance.now() > Application.Main.Renderer.LastRender + 6 + this.PendingAddGeometryDataRequests / 200 + (window.performance.now() - WaitingSince) / 300){
  			setTimeout(function(){
  				this.AddVirtualGeometryData(Data, Callback, true, WaitingSince);
  			}.bind(this), this.PendingAddVirtualGeometryDataRequests + 20);
  			if(!ReCall) this.PendingAddVirtualGeometryDataRequests++;
  			return;
  		}

      let Mesh;


      let Geometry = new THREE.BufferGeometry();
      let Material;
      if(Data.Transparent) Material = new THREE.MeshPhongMaterial({
        "map": Data.TextureMap,
				"alphaTest": 0.05,
				"side": THREE.DoubleSide,
				"transparent": true/*,
        "color": Math.floor(Math.random() * 256) * 65536 + Math.floor(Math.random() * 256) * 256 + Math.floor(Math.random() * 256)*/
      });
      else Material = new THREE.MeshPhongMaterial({
				"map": Data.TextureMap,
				"alphaTest": 1,
				"transparent": false/*,
				"color": Depth * 32 * 65536 + Depth * 32 * 256 + Depth * 32,
        "color": Math.floor(Math.random() * 256) * 65536 + Math.floor(Math.random() * 256) * 256 + Math.floor(Math.random() * 256)*/
			});

      //Material.castShadow = true;
      //Material.receiveShadow = true;

      const PositionNumComponents = 3, NormalNumComponents = 3, UVNumComponents = 2;

			Geometry.setAttribute("position", new THREE.BufferAttribute(new Uint8Array(Data.Positions), PositionNumComponents));
			Geometry.setAttribute("normal", new THREE.BufferAttribute(new Uint8Array(Data.Normals), NormalNumComponents));
			Geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(Data.UVs), UVNumComponents));
			//debugger;

			Geometry.setIndex(Data.Indices);

			Mesh = new THREE.Mesh(Geometry, Material);

      const RegionX = (Data.URegionX << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  		const RegionY = (Data.URegionY << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  		const RegionZ = (Data.URegionZ << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  		const FACTOR = 2 ** (VIRTUAL_REGION_DEPTHS - Data.Depth);
  		const SIDE_LENGTH = 1 << SIDE_LENGTH_POWER;
  		const SCALE = SIDE_LENGTH * FACTOR;

  		Mesh.position.set(RegionX * Region.SIDE_LENGTH * FACTOR, RegionY * Region.SIDE_LENGTH * FACTOR, RegionZ * Region.SIDE_LENGTH * FACTOR);
  		Mesh.scale.set(FACTOR, FACTOR, FACTOR);
  		//Mesh.scale.set(0.125, 0.125, 0.125);
  		if(this.World.VirtualRegions[Data.Depth][Data.URegionX + "," + Data.URegionY + "," + Data.URegionZ] !== undefined &&
         this.World.VirtualRegions[Data.Depth][Data.URegionX + "," + Data.URegionY + "," + Data.URegionZ].StopState[0] === 0) this.Scene.add(Mesh);
  		if(ReCall) this.PendingAddVirtualGeometryDataRequests--;
      if(Callback) Callback(Data, Mesh);
  		return Mesh;
    }
    AddGeometryData(Data, Callback, ReCall = false, WaitingSince = window.performance.now()){
      //debugger;
      const Identifier = Data.URegionX + "," + Data.URegionY + "," + Data.URegionZ;
      {
        let Region = this.World.Regions[Identifier]; //Careful! This declaration overrode the access to the static properties of the Region class.
        if(Region === undefined){
          if(ReCall) this.PendingAddGeometryDataRequests--;
          return;
        }
      }
      if(Data.Positions.length === 0 || Data.Normals.length === 0 || Data.Indices.length === 0 || Data.UVs.length === 0) return;


      /*if(Region.StopState[0] === 1){
        Region.Destruct();
        delete this.World.Regions[Identifier];
        if(ReCall) this.PendingAddGeometryDataRequests--;
        return;
      }*/

      if(window.performance.now() > Application.Main.Renderer.LastRender + 6 + this.PendingAddGeometryDataRequests / 200 + (window.performance.now() - WaitingSince) / 300){
  			setTimeout(function(){
  				this.AddGeometryData(Data, Callback, true, WaitingSince);
  			}.bind(this), this.PendingAddGeometryDataRequests + 20);
  			if(!ReCall) this.PendingAddGeometryDataRequests++;
  			return;
  		}


  		let Mesh;

			let Geometry = new THREE.BufferGeometry();
			let Material;

			if(Data.Transparent) Material = new THREE.MeshPhongMaterial({
				"map": Data.TextureMap,
				"alphaTest": 0.05,
				"side": THREE.DoubleSide,
				"transparent": true
			});
			else Material = new THREE.MeshPhongMaterial({
				"map": Data.TextureMap,
				"alphaTest": 1,
				"transparent": false/*,
				"color": 0x007fff*/
			});

			//Material.castShadow = true;
			//Material.receiveShadow = true;



			const PositionNumComponents = 3, NormalNumComponents = 3, UVNumComponents = 2;

			Geometry.setAttribute("position", new THREE.BufferAttribute(new Uint8Array(Data.Positions), PositionNumComponents));
			Geometry.setAttribute("normal", new THREE.BufferAttribute(new Uint8Array(Data.Normals), NormalNumComponents));
			Geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(Data.UVs), UVNumComponents));
			//debugger;

			Geometry.setIndex(Data.Indices);

			Mesh = new THREE.Mesh(Geometry, Material);

  		const RegionX = (Data.URegionX << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  		const RegionY = (Data.URegionY << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
  		const RegionZ = (Data.URegionZ << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;

  		Mesh.position.set(RegionX * Region.SIDE_LENGTH, RegionY * Region.SIDE_LENGTH, RegionZ * Region.SIDE_LENGTH);
  		if(this.World.Regions[Data.URegionX + "," + Data.URegionY + "," + Data.URegionZ] !== undefined &&
         this.World.Regions[Data.URegionX + "," + Data.URegionY + "," + Data.URegionZ].StopState[0] === 0) this.Scene.add(Mesh);
  		if(ReCall) this.PendingAddGeometryDataRequests--;
      if(Callback) Callback(Data, Mesh);
  		return Mesh;
  	}
  };
  constructor(){
    super();
    this.AddEventListener("TextureLoad", function(){
      this.PostInit();
    }.bind(this));
    this.Textures = {};

    this.RenderTime = 10;
    this.LastRender = window.performance.now();
    Application.Listener.AddEventListener("PreInitEnd", function(){
      this.GeometryDataGenerator = new Renderer.GeometryDataGenerator(this.Scene, Application.Main.Game.World);
    }.bind(this));

    this.Renderer = new THREE.WebGLRenderer;
    this.Renderer.setSize(window.innerWidth, window.innerHeight);
    this.Renderer.autoClear = false;
    this.Renderer.domElement.style.zIndex = 1000;
    this.Renderer.domElement.style.position = "absolute";

    this.Scene = new THREE.Scene;
    this.Scene.background = new THREE.Color("#7fffff");
    this.Scene.fog = new THREE.FogExp2(0x7fffff, 0.0002);

    this.Camera = new THREE.PerspectiveCamera(110, window.innerWidth / window.innerHeight, 0.1, 100000);
    this.Camera.rotation.order = "YXZ";

    window.addEventListener("resize", function(){
      this.Renderer.setSize(window.innerWidth, window.innerHeight);
      this.Camera.aspect = window.innerWidth / window.innerHeight;
      this.Camera.updateProjectionMatrix();
      this.Camera.rotation.order = "YXZ";
    }.bind(this));

    this.AddLight(0, 0, 100, 0.35);
    this.AddLight(100, 0, 0, 0.50);
    this.AddLight(0, 100, 0, 0.65);

    this.FireEventListeners("InitEnd");

    document.getElementsByTagName("body")[0].appendChild(this.Renderer.domElement);

    this.InitialiseTextures();
  }
  Render(){
		window.requestAnimationFrame(function(){
			this.Render();
		}.bind(this));
		this.RenderTime = window.performance.now() - this.LastRender;
		this.LastRender = window.performance.now();

		this.Renderer.render(this.Scene, this.Camera);

    Application.Main.PerformanceOverlay.Graph.AddItem(this.RenderTime);

		//this.Graph.AddItem(this.PendingAddGeometryDataRequests);
		//this.DebugInfoOverlay.Graph.AddItem(this.RenderTime);


    //this.GeometryDataGenerator.GenerateMoreGeometryData();
    //Virtual geometry data will be generated automatically.
    this.GeometryDataGenerator.GenerateMoreGeometryData();
	}
  InitialiseTextures(){
    this.TextureLoader = new THREE.TextureLoader;
    this.Textures.TextureMap = this.TextureLoader.load(__ScriptPath__ + "/Atlas.png", function(){
      this.Textures.TextureMap.magFilter = THREE.NearestFilter;
      this.Textures.TextureMap.minFilter = THREE.NearestFilter;
      this.FireEventListeners("TextureLoad");
    }.bind(this));
  }
  PostInit(){
    window.requestAnimationFrame(function(){
      this.Render();
    }.bind(this));
  }
  AddLight(x, y, z, l = 1){
		let Light = new THREE.DirectionalLight(0xffffff, l);
		Light.position.set(x, y, z);
		this.Scene.add(Light);
	}

  AddGeometryData(Transparent, Positions, Normals, Indices, UVs, URegionX, URegionY, URegionZ, TextureMap, Callback, ReCall = false, WaitingSince = window.performance.now()){
    if(Positions.length === 0 || Normals.length === 0 || Indices.length === 0 || UVs.length === 0) return undefined;

  }
}

class Game extends Listenable{
  constructor(Main){
    super();
    this.Main = Main;
    this.Controls = new Controls(this.Main.Renderer.Renderer.domElement, this.Main.Renderer.Camera);
    this.World = new World;
  }
}

class Controls extends Listenable{
  constructor(Element, Camera){
    super();
    this.PointerLock = new PointerLock(Element).Register();
    this.KeyStates = {};
    this.ControlMap = {
      "Movement":{
        "Forwards": "KeyW",
        "Backwards": "KeyS",
        "Leftwards": "KeyA",
        "Rightwards": "KeyD",
        "Upwards": "Space",
        "Downwards": "ShiftLeft"
      },
      "PerformanceOverlay": "F3",
      "Zoom": "KeyC"
    };
    this.MouseControls = {

    };
    this.Settings = {
      "MouseSensitivity": 0.002,
      "InvertY": true,
      "MovementSpeed": 1
    };
    this.Camera = Camera;
    this.PointerLock.AddEventListener("MouseMove", function(Event){
  		this.Camera.rotation.y -= Event.movementX * this.Settings.MouseSensitivity * (!!this.Settings.InvertY * 2 - 1);
  		this.Camera.rotation.x += Event.movementY * this.Settings.MouseSensitivity;
  		this.Camera.rotation.x = Math.max(Math.PI / -2, Math.min(Math.PI / 2, this.Camera.rotation.x));
    }.bind(this));

    document.addEventListener("keydown", function(Key){
			this.KeyStates[Key.code] = true;
		}.bind(this));
		document.addEventListener("keyup", function(Key){
			this.KeyStates[Key.code] = false;
		}.bind(this));

    this.UpdatePlayerPosition();
  }
  UpdatePlayerPosition(){
    window.requestAnimationFrame(function(){this.UpdatePlayerPosition();}.bind(this));
    //Todo: Make this framerate-independant.
    this.Camera.position.y += (!!this.KeyStates[this.ControlMap.Movement.Upwards] - !!this.KeyStates[this.ControlMap.Movement.Downwards]) * this.Settings.MovementSpeed;

		this.Camera.position.x -= (!!this.KeyStates[this.ControlMap.Movement.Forwards] - !!this.KeyStates[this.ControlMap.Movement.Backwards]) * Math.sin(this.Camera.rotation.y) * this.Settings.MovementSpeed;
		this.Camera.position.z -= (!!this.KeyStates[this.ControlMap.Movement.Forwards] - !!this.KeyStates[this.ControlMap.Movement.Backwards]) * Math.cos(this.Camera.rotation.y) * this.Settings.MovementSpeed;
		this.Camera.position.x -= (!!this.KeyStates[this.ControlMap.Movement.Leftwards] - !!this.KeyStates[this.ControlMap.Movement.Rightwards]) * Math.cos(this.Camera.rotation.y) * this.Settings.MovementSpeed;
		this.Camera.position.z += (!!this.KeyStates[this.ControlMap.Movement.Leftwards] - !!this.KeyStates[this.ControlMap.Movement.Rightwards]) * Math.sin(this.Camera.rotation.y) * this.Settings.MovementSpeed;
  }
}

class World extends Listenable{
  static Generator = class extends Listenable{
    constructor(Regions, VirtualRegions){
      super();
      this.Regions = Regions;
      this.VirtualRegions = VirtualRegions;


      this.WorkerRegionGenerator = new Worker(__ScriptPath__ + "/WorkerRegionGenerator.js");
      this.WorkerRegionGenerator.addEventListener("error", function(e) {
  		    (DEBUG_LEVEL <= DEBUG_LEVELS.WARNING) && console.warn("Worker error:", e);
  		});
  		this.WorkerRegionGenerator.addEventListener("messageerror", function(e) {
  		    (DEBUG_LEVEL <= DEBUG_LEVELS.WARNING) && console.warn("Message error:", e);
  		});
      this.WorkerRegionGenerator.addEventListener("message", function(Event){
  			switch(Event.data.Request){
          case "SaveRegionData":{
            const URegionX = Event.data.URegionX;
            const URegionY = Event.data.URegionY;
            const URegionZ = Event.data.URegionZ;
            const Identifier = URegionX + "," + URegionY + "," + URegionZ;
            if(this.Regions[Identifier] === undefined) return; //The region was queued for deletion.
            this.Regions[Identifier].Init(Event.data.RegionData, Event.data.HeightMap, Event.data.LoadState, Event.data.CommonBlock);
            (DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.debug("[" + (window.performance.now() >> 0) + "] Saved data for Region " + URegionX + ", " + URegionY + ", " + URegionZ);
            this.FireEventListeners("SaveRegionData", Event);
            break;
          }
          case "SaveVirtualRegionData":{
            const URegionX = Event.data.URegionX;
            const URegionY = Event.data.URegionY;
            const URegionZ = Event.data.URegionZ;
            const Depth = Event.data.Depth;
            const Identifier = URegionX + "," + URegionY + "," + URegionZ;
            const VRDepthObject = this.VirtualRegions[Depth];
            if(VRDepthObject[Identifier] === undefined) return;
            VRDepthObject[Identifier].Init(Event.data.RegionData, Event.data.HeightMap, Event.data.LoadState, Event.data.CommonBlock);
            (DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.debug("[" + (window.performance.now() >> 0) + "] Saved data for Virtual Region " + URegionX + ", " + URegionY + ", " + URegionZ + " at depth " + Depth);
            this.FireEventListeners("SaveVirtualRegionData", Event);
            break;
          }
        }
  		}.bind(this));
    }
  };
  constructor(){
    super();
    this.Regions = {};
    this.VirtualRegions = [];
    this.WorldGenerator = new World.Generator(this.Regions, this.VirtualRegions);
    this.PrematureUnloads = 0;
    this.PrematureVirtualUnloads = 0;

    window.requestAnimationFrame(function(){
      this.GenerateMoreRegions();
      this.GenerateMoreVirtualRegions();
      this.UnloadRegions();
      this.UnloadVirtualRegions();
    }.bind(this));
  }
  GenerateMoreRegions(){
    window.requestAnimationFrame(function(){this.GenerateMoreRegions();}.bind(this));
    const PlayerX = Application.Main.Renderer.Camera.position.x;
		const PlayerY = Application.Main.Renderer.Camera.position.y;
		const PlayerZ = Application.Main.Renderer.Camera.position.z;

		const SIDE_LENGTH = 1 << SIDE_LENGTH_POWER;

		const ThisX = Math.floor(PlayerX / SIDE_LENGTH);
		const ThisY = Math.floor(PlayerY / SIDE_LENGTH);
		const ThisZ = Math.floor(PlayerZ / SIDE_LENGTH);
    const ThisMinRegionX = Math.floor((ThisX - VIRTUAL_LOAD_DISTANCE) / 2) * 2 - 1, ThisMaxRegionX = Math.ceil((ThisX + VIRTUAL_LOAD_DISTANCE) / 2) * 2 + 1;
		const ThisMinRegionY = Math.floor((ThisY - VIRTUAL_LOAD_DISTANCE) / 2) * 2 - 1, ThisMaxRegionY = Math.ceil((ThisY + VIRTUAL_LOAD_DISTANCE) / 2) * 2 + 1;
		const ThisMinRegionZ = Math.floor((ThisZ - VIRTUAL_LOAD_DISTANCE) / 2) * 2 - 1, ThisMaxRegionZ = Math.ceil((ThisZ + VIRTUAL_LOAD_DISTANCE) / 2) * 2 + 1;

    for(let RegionX = ThisMinRegionX; RegionX < ThisMaxRegionX; RegionX++){
      const URegionX = (RegionX >>> 0) % (1 << POWER_OFFSET);
      const IdentifierX = URegionX + ",";
      for(let RegionY = ThisMinRegionY; RegionY < ThisMaxRegionY; RegionY++){
        const URegionY = (RegionY >>> 0) % (1 << POWER_OFFSET);
        const IdentifierXY = IdentifierX + URegionY + ",";
        for(let RegionZ = ThisMinRegionZ; RegionZ < ThisMaxRegionZ; RegionZ++){
          const URegionZ = (RegionZ >>> 0) % (1 << POWER_OFFSET);
          const Identifier = IdentifierXY + URegionZ;
          if((this.Regions[Identifier]?.LoadState | 0) >= Region.LOAD_STATE_GENERATING_DATA) continue;
					this.Regions[Identifier] = new Region(URegionX, URegionY, URegionZ);
					this.Regions[Identifier].LoadState = Region.LOAD_STATE_GENERATING_DATA;
					const DataArray = new Uint8Array(new SharedArrayBuffer(Region.SIDE_LENGTH ** 3));
					const HeightMap = new Int8Array(new SharedArrayBuffer(Region.SIDE_LENGTH ** 2));
					this.WorldGenerator.WorkerRegionGenerator.postMessage({
						"Request": "GenerateRegionData",
						"URegionX": URegionX,
						"URegionY": URegionY,
						"URegionZ": URegionZ,
						"SideLength": Region.SIDE_LENGTH,
						"DataArray": DataArray,
						"HeightMap": HeightMap,
            "StopState": this.Regions[Identifier].StopState
					});
        }
			}
		}
  }
  GenerateMoreVirtualRegions(Depth = VIRTUAL_REGION_DEPTHS - 1, LastMinRegionX, LastMaxRegionX, LastMinRegionY, LastMaxRegionY, LastMinRegionZ, LastMaxRegionZ){
    const SIDE_LENGTH = 1 << SIDE_LENGTH_POWER;
    const PlayerX = Application.Main.Renderer.Camera.position.x;
    const PlayerY = Application.Main.Renderer.Camera.position.y;
    const PlayerZ = Application.Main.Renderer.Camera.position.z;
    if(Depth === VIRTUAL_REGION_DEPTHS - 1){
			window.setTimeout(function(){this.GenerateMoreVirtualRegions();}.bind(this), 1000);
      const LastX = Math.floor(PlayerX / SIDE_LENGTH);
  		const LastY = Math.floor(PlayerY / SIDE_LENGTH);
  		const LastZ = Math.floor(PlayerZ / SIDE_LENGTH);
      LastMinRegionX = Math.floor((LastX - VIRTUAL_LOAD_DISTANCE) / 2) * 2, LastMaxRegionX = Math.ceil((LastX + VIRTUAL_LOAD_DISTANCE) / 2) * 2;
  		LastMinRegionY = Math.floor((LastY - VIRTUAL_LOAD_DISTANCE) / 2) * 2, LastMaxRegionY = Math.ceil((LastY + VIRTUAL_LOAD_DISTANCE) / 2) * 2;
  		LastMinRegionZ = Math.floor((LastZ - VIRTUAL_LOAD_DISTANCE) / 2) * 2, LastMaxRegionZ = Math.ceil((LastZ + VIRTUAL_LOAD_DISTANCE) / 2) * 2;
		}
    //if(Depth < 4) return;

		if(this.VirtualRegions[Depth] === undefined) this.VirtualRegions[Depth] = {};

    const VRDepthObject = this.VirtualRegions[Depth];
		const ReversePower = 2 ** (VIRTUAL_REGION_DEPTHS - Depth);

		const ThisX = Math.floor(PlayerX / (ReversePower * SIDE_LENGTH));
		const ThisY = Math.floor(PlayerY / (ReversePower * SIDE_LENGTH));
		const ThisZ = Math.floor(PlayerZ / (ReversePower * SIDE_LENGTH));
    const ThisMinRegionX = Math.floor((ThisX - VIRTUAL_LOAD_DISTANCE) / 2) * 2, ThisMaxRegionX = Math.ceil((ThisX + VIRTUAL_LOAD_DISTANCE) / 2) * 2;
		const ThisMinRegionY = Math.floor((ThisY - VIRTUAL_LOAD_DISTANCE) / 2) * 2, ThisMaxRegionY = Math.ceil((ThisY + VIRTUAL_LOAD_DISTANCE) / 2) * 2;
		const ThisMinRegionZ = Math.floor((ThisZ - VIRTUAL_LOAD_DISTANCE) / 2) * 2, ThisMaxRegionZ = Math.ceil((ThisZ + VIRTUAL_LOAD_DISTANCE) / 2) * 2;

    for(let RegionX = ThisMinRegionX; RegionX < ThisMaxRegionX; RegionX++){
      const URegionX = (RegionX >>> 0) % (1 << POWER_OFFSET);
      const IdentifierX = URegionX + ",";
      for(let RegionY = ThisMinRegionY; RegionY < ThisMaxRegionY; RegionY++){
        const URegionY = (RegionY >>> 0) % (1 << POWER_OFFSET);
        const IdentifierXY = IdentifierX + URegionY + ",";
        for(let RegionZ = ThisMinRegionZ; RegionZ < ThisMaxRegionZ; RegionZ++){
          const URegionZ = (RegionZ >>> 0) % (1 << POWER_OFFSET);
          const Identifier = IdentifierXY + URegionZ;
  				if(LastMinRegionX / 2 <= RegionX && LastMaxRegionX / 2 > RegionX &&
             LastMinRegionY / 2 <= RegionY && LastMaxRegionY / 2 > RegionY &&
             LastMinRegionZ / 2 <= RegionZ && LastMaxRegionZ / 2 > RegionZ){
            continue;
          }
          if((VRDepthObject[Identifier]?.LoadState | 0) >= Region.LOAD_STATE_GENERATING_DATA) continue;

					VRDepthObject[Identifier] = new VirtualRegion(Depth, URegionX, URegionY, URegionZ);
					VRDepthObject[Identifier].LoadState = Region.LOAD_STATE_GENERATING_DATA;
					const DataArray = new Uint8Array(new SharedArrayBuffer(Region.SIDE_LENGTH ** 3));
					const HeightMap = new Int8Array(new SharedArrayBuffer(Region.SIDE_LENGTH ** 2));
          this.WorldGenerator.WorkerRegionGenerator.postMessage({
						"Request": "GenerateVirtualRegionData",
						"Depth": Depth,
						"URegionX": URegionX,
						"URegionY": URegionY,
						"URegionZ": URegionZ,
						"SideLength": Region.SIDE_LENGTH,
						"DataArray": DataArray,
            "HeightMap": HeightMap,
            "StopState": VRDepthObject[Identifier].StopState
					});
        }
			}
		}
		if(Depth >> 1) this.GenerateMoreVirtualRegions(--Depth, ThisMinRegionX, ThisMaxRegionX, ThisMinRegionY, ThisMaxRegionY, ThisMinRegionZ, ThisMaxRegionZ);
	}

  UnloadRegions(){
		window.setTimeout(function(){this.UnloadRegions();}.bind(this), 1000);
		if(window.performance.now() < 1000) return;

    (DEBUG_LEVEL <= DEBUG_LEVELS.DEBUG) && console.time("Region unloader took");
    const RegionArray = Application.Main.Game.World.Regions;

    const PlayerX = Application.Main.Renderer.Camera.position.x;
		const PlayerY = Application.Main.Renderer.Camera.position.y;
		const PlayerZ = Application.Main.Renderer.Camera.position.z;

		const SIDE_LENGTH = 1 << SIDE_LENGTH_POWER;

		const ThisX = Math.floor(PlayerX / SIDE_LENGTH);
		const ThisY = Math.floor(PlayerY / SIDE_LENGTH);
		const ThisZ = Math.floor(PlayerZ / SIDE_LENGTH);
    const ThisMinRegionX = Math.floor((ThisX - VIRTUAL_LOAD_DISTANCE) / 2) * 2 - 1, ThisMaxRegionX = Math.ceil((ThisX + VIRTUAL_LOAD_DISTANCE) / 2) * 2 + 1;
		const ThisMinRegionY = Math.floor((ThisY - VIRTUAL_LOAD_DISTANCE) / 2) * 2 - 1, ThisMaxRegionY = Math.ceil((ThisY + VIRTUAL_LOAD_DISTANCE) / 2) * 2 + 1;
		const ThisMinRegionZ = Math.floor((ThisZ - VIRTUAL_LOAD_DISTANCE) / 2) * 2 - 1, ThisMaxRegionZ = Math.ceil((ThisZ + VIRTUAL_LOAD_DISTANCE) / 2) * 2 + 1;

    let AllowedRegions = new Set;

    for(let RegionX = ThisMinRegionX; RegionX < ThisMaxRegionX; RegionX++){
      const URegionX = (RegionX >>> 0) % (1 << POWER_OFFSET);
      const IdentifierX = URegionX + ",";
      for(let RegionY = ThisMinRegionY; RegionY < ThisMaxRegionY; RegionY++){
        const URegionY = (RegionY >>> 0) % (1 << POWER_OFFSET);
        const IdentifierXY = IdentifierX + URegionY + ",";
        for(let RegionZ = ThisMinRegionZ; RegionZ < ThisMaxRegionZ; RegionZ++){
          const URegionZ = (RegionZ >>> 0) % (1 << POWER_OFFSET);
          const Identifier = IdentifierXY + URegionZ;
          AllowedRegions.add(Identifier);
        }
			}
		}

    for(const Identifier in this.Regions){
      const CurrentRegion = this.Regions[Identifier];
      if(CurrentRegion === undefined) continue;
      if(AllowedRegions.has(Identifier)) continue;
      const URegionX = CurrentRegion.URegionX;
      const URegionY = CurrentRegion.URegionY;
      const URegionZ = CurrentRegion.URegionZ;
      if(CurrentRegion.LoadState <= Region.LOAD_STATE_GENERATING_MESH){
        this.Abort(CurrentRegion);
      }
      CurrentRegion.Destruct();
      delete this.Regions[Identifier];
      (DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.debug("Deleted mesh for Region " + URegionX + ", " + URegionY + ", " + URegionZ);
    }

    (DEBUG_LEVEL <= DEBUG_LEVELS.DEBUG) && console.timeEnd("Region unloader took");
	}
  UnloadVirtualRegions(Depth = VIRTUAL_REGION_DEPTHS - 1, LastMinRegionX, LastMaxRegionX, LastMinRegionY, LastMaxRegionY, LastMinRegionZ, LastMaxRegionZ){
    const SIDE_LENGTH = 1 << SIDE_LENGTH_POWER;
    const PlayerX = Application.Main.Renderer.Camera.position.x;
    const PlayerY = Application.Main.Renderer.Camera.position.y;
    const PlayerZ = Application.Main.Renderer.Camera.position.z;
    if(Depth === VIRTUAL_REGION_DEPTHS - 1){
			window.setTimeout(function(){this.UnloadVirtualRegions();}.bind(this), 1000);
      const LastX = Math.floor(PlayerX / SIDE_LENGTH);
  		const LastY = Math.floor(PlayerY / SIDE_LENGTH);
  		const LastZ = Math.floor(PlayerZ / SIDE_LENGTH);
      LastMinRegionX = Math.floor((LastX - VIRTUAL_LOAD_DISTANCE) / 2) * 2, LastMaxRegionX = Math.ceil((LastX + VIRTUAL_LOAD_DISTANCE) / 2) * 2;
  		LastMinRegionY = Math.floor((LastY - VIRTUAL_LOAD_DISTANCE) / 2) * 2, LastMaxRegionY = Math.ceil((LastY + VIRTUAL_LOAD_DISTANCE) / 2) * 2;
  		LastMinRegionZ = Math.floor((LastZ - VIRTUAL_LOAD_DISTANCE) / 2) * 2, LastMaxRegionZ = Math.ceil((LastZ + VIRTUAL_LOAD_DISTANCE) / 2) * 2;
			if(window.performance.now() < 10000) return;
		}

		if(this.VirtualRegions[Depth] === undefined) this.VirtualRegions[Depth] = {};

		const VIRTUAL_LOAD_DISTANCE_HALVED = VIRTUAL_LOAD_DISTANCE / 2; //This should stay as VIRTUAL_LOAD_DISTANCE, not VIRTUAL_UNLOAD_DISTANCE.

    let AllowedVirtualRegions = new Set;
    let InnerVirtualRegions = new Set;

    const VRDepthObject = this.VirtualRegions[Depth];
		const ReversePower = 2 ** (VIRTUAL_REGION_DEPTHS - Depth);

		const ThisX = Math.floor(PlayerX / (ReversePower * SIDE_LENGTH));
		const ThisY = Math.floor(PlayerY / (ReversePower * SIDE_LENGTH));
		const ThisZ = Math.floor(PlayerZ / (ReversePower * SIDE_LENGTH));
    const ThisMinRegionX = Math.floor((ThisX - VIRTUAL_LOAD_DISTANCE) / 2) * 2, ThisMaxRegionX = Math.ceil((ThisX + VIRTUAL_LOAD_DISTANCE) / 2) * 2;
		const ThisMinRegionY = Math.floor((ThisY - VIRTUAL_LOAD_DISTANCE) / 2) * 2, ThisMaxRegionY = Math.ceil((ThisY + VIRTUAL_LOAD_DISTANCE) / 2) * 2;
		const ThisMinRegionZ = Math.floor((ThisZ - VIRTUAL_LOAD_DISTANCE) / 2) * 2, ThisMaxRegionZ = Math.ceil((ThisZ + VIRTUAL_LOAD_DISTANCE) / 2) * 2;

    for(let RegionX = ThisMinRegionX; RegionX < ThisMaxRegionX; RegionX++){
      const URegionX = (RegionX >>> 0) % (1 << POWER_OFFSET);
      const IdentifierX = URegionX + ",";
      for(let RegionY = ThisMinRegionY; RegionY < ThisMaxRegionY; RegionY++){
        const URegionY = (RegionY >>> 0) % (1 << POWER_OFFSET);
        const IdentifierXY = IdentifierX + URegionY + ",";
        for(let RegionZ = ThisMinRegionZ; RegionZ < ThisMaxRegionZ; RegionZ++){
          const URegionZ = (RegionZ >>> 0) % (1 << POWER_OFFSET);
          const Identifier = IdentifierXY + URegionZ;
  				if(LastMinRegionX / 2 <= RegionX && LastMaxRegionX / 2 > RegionX &&
             LastMinRegionY / 2 <= RegionY && LastMaxRegionY / 2 > RegionY &&
             LastMinRegionZ / 2 <= RegionZ && LastMaxRegionZ / 2 > RegionZ){
            InnerVirtualRegions.add(Identifier);
            continue;
          }
          AllowedVirtualRegions.add(Identifier);
        }
			}
		}


    for(const Identifier in VRDepthObject){
      const CurrentRegion = VRDepthObject[Identifier];
      if(CurrentRegion === undefined) continue;
			const RegionX = (CurrentRegion.URegionX << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
      const RegionY = (CurrentRegion.URegionY << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
      const RegionZ = (CurrentRegion.URegionZ << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
      const URegionX = VRDepthObject[Identifier].URegionX;
      const URegionY = VRDepthObject[Identifier].URegionY;
      const URegionZ = VRDepthObject[Identifier].URegionZ;

      if(InnerVirtualRegions.has(Identifier)){
        //Inside of little inner cube.

        if(CurrentRegion.LoadState === Region.LOAD_STATE_TEMP_HIDDEN_MESH){
          if(CurrentRegion.TimeToLive --> 0) continue;
          else{
            /*CurrentRegion.Destruct();
            delete VRDepthObject[Identifier];
            */(DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.debug("Deleted mesh for INNER Virtual Region " + URegionX + ", " + URegionY + ", " + URegionZ + " at depth " + Depth);
          }
        } else if(CurrentRegion.LoadState === Region.LOAD_STATE_VISIBLE_MESH){
          //window.setTimeout(function(){
            CurrentRegion.LoadState = Region.LOAD_STATE_TEMP_HIDDEN_MESH;
            CurrentRegion.TimeToLive = Region.DELETE_TEMP_HIDDEN_MESH_TTL_DEFAULT;
            CurrentRegion.SetVisibility(false);
          //}.bind(this), 1337 * (VIRTUAL_REGION_DEPTHS - Depth));
          continue;
        } else if(CurrentRegion.LoadState === Region.LOAD_STATE_HIDDEN_MESH ||
                  CurrentRegion.LoadState < Region.LOAD_STATE_GENERATING_MESH) continue;
      }
      else if(CurrentRegion.LoadState === Region.LOAD_STATE_TEMP_HIDDEN_MESH){ //Re-enable previously hidden regions that were in the inner cube.
        CurrentRegion.LoadState = Region.LOAD_STATE_VISIBLE_MESH;
        CurrentRegion.SetVisibility(true);
      }



      if(AllowedVirtualRegions.has(Identifier)) continue;

      this.Abort(CurrentRegion);
      if(CurrentRegion.LoadState <= Region.LOAD_STATE_GENERATING_MESH){
        this.PrematureVirtualUnloads++;
      }
      //window.setTimeout(function(){
        CurrentRegion.Destruct();

        delete VRDepthObject[Identifier];
        (DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.debug("Deleted mesh for Virtual Region " + URegionX + ", " + URegionY + ", " + URegionZ + " at depth " + Depth);
      //}.bind(this), 1420 * (VIRTUAL_REGION_DEPTHS - Depth)); //This causes ghost regions to appear! This needs a proper fix.
    }
    if(Depth >> 1) this.UnloadVirtualRegions(--Depth, ThisMinRegionX, ThisMaxRegionX, ThisMinRegionY, ThisMaxRegionY, ThisMinRegionZ, ThisMaxRegionZ);
	}
  Abort(Region){
    Region.StopState[0] = 1;
  }
  UnloadVirtualRegions_weird(Depth = VIRTUAL_REGION_DEPTHS - 1){
		if(Depth === VIRTUAL_REGION_DEPTHS - 1){
			window.setTimeout(function(){this.UnloadVirtualRegions();}.bind(this), 1000);
			if(window.performance.now() < 10000) return;
		}
    const PlayerX = Application.Main.Renderer.Camera.position.x;
		const PlayerY = Application.Main.Renderer.Camera.position.y;
		const PlayerZ = Application.Main.Renderer.Camera.position.z;

    if(this.VirtualRegions[Depth] === undefined) this.VirtualRegions[Depth] = {};

    const VRDepthObject = this.VirtualRegions[Depth];
		const SIDE_LENGTH = 1 << SIDE_LENGTH_POWER;
		const ReversePower = 2 ** (VIRTUAL_REGION_DEPTHS - Depth);

    const ThisX = Math.floor(PlayerX / (ReversePower * SIDE_LENGTH));
		const ThisY = Math.floor(PlayerY / (ReversePower * SIDE_LENGTH));
		const ThisZ = Math.floor(PlayerZ / (ReversePower * SIDE_LENGTH));
		const ThisMinRegionX = Math.floor((ThisX - VIRTUAL_LOAD_DISTANCE) / 2) * 2, ThisMaxRegionX = Math.ceil((ThisX + VIRTUAL_LOAD_DISTANCE) / 2) * 2;
		const ThisMinRegionY = Math.floor((ThisY - VIRTUAL_LOAD_DISTANCE) / 2) * 2, ThisMaxRegionY = Math.ceil((ThisY + VIRTUAL_LOAD_DISTANCE) / 2) * 2;
		const ThisMinRegionZ = Math.floor((ThisZ - VIRTUAL_LOAD_DISTANCE) / 2) * 2, ThisMaxRegionZ = Math.ceil((ThisZ + VIRTUAL_LOAD_DISTANCE) / 2) * 2;
		const CenterRegionX = (ThisMinRegionX + ThisMaxRegionX) / 2;
		const CenterRegionY = (ThisMinRegionY + ThisMaxRegionY) / 2;
		const CenterRegionZ = (ThisMinRegionZ + ThisMaxRegionZ) / 2;
    const VIRTUAL_LOAD_DISTANCE_HALVED = VIRTUAL_LOAD_DISTANCE / 2;

    let AllowedVirtualRegions = new Set;
    let InnerVirtualRegions = new Set;

    for(let RegionX = ThisMinRegionX; RegionX < ThisMaxRegionX; RegionX++){
			const URegionX = (RegionX >>> 0) % (1 << POWER_OFFSET);
      const IdentifierX = URegionX + ",";
			for(let RegionY = ThisMinRegionY; RegionY < ThisMaxRegionY; RegionY++){
				const URegionY = (RegionY >>> 0) % (1 << POWER_OFFSET);
        const IdentifierXY = IdentifierX + URegionY + ",";
				for(let RegionZ = ThisMinRegionZ; RegionZ < ThisMaxRegionZ; RegionZ++){
					const URegionZ = (RegionZ >>> 0) % (1 << POWER_OFFSET);
          const Identifier = IdentifierXY + URegionZ;

					if(RegionX < VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionX && RegionX >= -VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionX && RegionY < VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionY && RegionY >= -VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionY && RegionZ < VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionZ && RegionZ >= -VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionZ){
            InnerVirtualRegions.add(Identifier);
            continue;
          }
          AllowedVirtualRegions.add(Identifier);
				}
			}
		}
    for(const Identifier in VRDepthObject){
      const CurrentRegion = VRDepthObject[Identifier];

      if(CurrentRegion.LoadState === Region.LOAD_STATE_TEMP_HIDDEN_MESH){ //Re-enable previously hidden regions that were in the inner cube.
        CurrentRegion.LoadState = Region.LOAD_STATE_VISIBLE_MESH;
        CurrentRegion.SetVisibility(true);
      }

      if(AllowedVirtualRegions.has(Identifier)) continue;

      const RegionX = (CurrentRegion.URegionX << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
      const RegionY = (CurrentRegion.URegionY << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
      const RegionZ = (CurrentRegion.URegionZ << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;

      if(InnerVirtualRegions.has(Identifier)){
        if(CurrentRegion.LoadState === Region.LOAD_STATE_TEMP_HIDDEN_MESH){
          if(CurrentRegion.TimeToLive --> 0) continue;
        } else if(CurrentRegion.LoadState === Region.LOAD_STATE_VISIBLE_MESH){
          window.setTimeout(function(){
            CurrentRegion.LoadState = Region.LOAD_STATE_TEMP_HIDDEN_MESH;
            CurrentRegion.TimeToLive = Region.DELETE_TEMP_HIDDEN_MESH_TTL_DEFAULT;
            CurrentRegion.SetVisibility(false);
          }.bind(this), 1337 * (VIRTUAL_REGION_DEPTHS - Depth));
          continue;
        } else if(CurrentRegion.LoadState === Region.LOAD_STATE_HIDDEN_MESH ||
                  CurrentRegion.LoadState < Region.LOAD_STATE_GENERATING_MESH) continue;
      }

      const URegionX = VRDepthObject[Identifier].URegionX;
      const URegionY = VRDepthObject[Identifier].URegionY;
      const URegionZ = VRDepthObject[Identifier].URegionZ;
      window.setTimeout(function(){
        CurrentRegion.Destruct();

        delete VRDepthObject[Identifier];
        (DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.debug("Deleted mesh for Virtual Region " + URegionX + ", " + URegionY + ", " + URegionZ + " at depth " + Depth);
      }.bind(this), 1420 * (VIRTUAL_REGION_DEPTHS - Depth));
    }


    if(Depth >> 1) this.UnloadVirtualRegions(--Depth);
	}
}

class Region{
	static SIDE_LENGTH_POWER = SIDE_LENGTH_POWER;
	static SIDE_LENGTH = 1 << Region.SIDE_LENGTH_POWER;
	static SIDE_LENGTH_SQUARED = Region.SIDE_LENGTH ** 2;
	static SIDE_LENGTH_MINUS_ONE = Region.SIDE_LENGTH - 1;

	static LOAD_STATE_UNLOADED = 0; //Implied
	static LOAD_STATE_DELETED_DATA = 1;
	static LOAD_STATE_DELETED_MESH = 5;
	static LOAD_STATE_GENERATING_DATA = 9;
	static LOAD_STATE_GENERATED_DATA = 10;
	static LOAD_STATE_UNIFORM_DATA = 12;
	static LOAD_STATE_MESH_UPDATE_REQUIRED = 18;
	static LOAD_STATE_GENERATING_MESH = 20;
	static LOAD_STATE_GENERATED_MESH = 21;
	static LOAD_STATE_TEMP_HIDDEN_MESH = 28;
	static LOAD_STATE_HIDDEN_MESH = 29;
	static LOAD_STATE_VISIBLE_MESH = 30;

	static DELETE_TEMP_HIDDEN_MESH_TTL_DEFAULT = 5;
	///1 : The data for the region has been deleted because it was unloaded.
	///5 : The geometry data for the region has been deleted because it was unloaded.
	///9 : The data for this region is being generated.
	///10: The data for the region has been loaded/generated.
	///[Deprecated] 11: The data for this region hasn't been generated because it would be underground.
	///12: The data for this region hasn't been generated because it is made out of air (is invisible).
	///18: The region had an update and new geometry data has to be generated. (potentially modifying the existing one?)
	///20: The geometry data is being generated in another thread.
	///28: The geometry data has been hidden.
	///29: The geometry data has been hidden and will soon be deleted (see Region.prototype.TimeToLive)
	///30: The geometry data has been generated and the region can now be displayed.

  static STOP_STATE_CONTINUE = 0;
  static STOP_STATE_ABORT = 1;

	constructor(URegionX, URegionY, URegionZ){
		this.URegionX = URegionX;
		this.URegionY = URegionY;
		this.URegionZ = URegionZ;
    this.StopState = new Uint8Array(new SharedArrayBuffer(1)); //If this.StopState[0] === 1, then the region is pending deletion.
		this.TimeToLive = Region.DELETE_TEMP_HIDDEN_MESH_COUNTDOWN_DEFAULT; //Will only count down if required.
    this.IsVirtualRegion = new.target === VirtualRegion;
  }

	Init(RegionData, HeightMap, LoadState, CommonBlock){
		if(!CommonBlock) this.Data = RegionData;
		else RegionData = undefined;
		this.HeightMap = HeightMap;
		this.CommonBlock = CommonBlock;
		this.LoadState = LoadState;
		this.TransparentMesh = undefined;
		this.OpaqueMesh = undefined;
	}
	Destruct(){
		Region.RemoveMesh(this.TransparentMesh);
		Region.RemoveMesh(this.OpaqueMesh);
    this.Data = undefined;
		//delete this.Data;
	}
	AbortRegionGeneration(){
    throw new Error("Not supported.");
		Application.Main.Game.World.WorldGenerator.WorkerRegionGenerator.postMessage({
			"Request": "Abort",
			"URegionX": this.URegionX,
			"URegionY": this.URegionY,
			"URegionZ": this.URegionZ,
      "Depth": this.Depth
		});
	}
	AbortMeshGeneration(){
    throw new Error("Not supported.");
		Application.Main.Renderer.GeometryDataGenerator.WorkerGeometryDataGenerator.postMessage({
			"Request": "Abort",
			"URegionX": this.URegionX,
			"URegionY": this.URegionY,
			"URegionZ": this.URegionZ,
      "Depth": this.Depth
		});
	}
	SetVisibility(Visibility){
		if(this.TransparentMesh) this.TransparentMesh.visible = Visibility;
		if(this.OpaqueMesh) this.OpaqueMesh.visible = Visibility;
	}
  SetOpaqueMesh(Mesh){
    this.LoadState = Region.LOAD_STATE_VISIBLE_MESH;
    this.OpaqueMesh = Mesh;
    if(this instanceof VirtualRegion){
      this.Data = undefined;
      this.HeightMap = undefined;
    }
  }
  SetTransparentMesh(Mesh){
    this.LoadState = Region.LOAD_STATE_VISIBLE_MESH;
    this.TransparentMesh = Mesh;
    if(this instanceof VirtualRegion){
      this.Data = undefined;
      this.HeightMap = undefined;
    }
  }
	static RemoveMesh(Mesh){
		if(Mesh === undefined) return;
		Mesh.geometry.dispose();
		Mesh.material.dispose();
		Application.Main.Renderer.Scene.remove(Mesh);
		Mesh = undefined;
	}
}

class VirtualRegion extends Region{
	constructor(Depth, URegionX, URegionY, URegionZ){
		super(URegionX, URegionY, URegionZ);
		this.Depth = Depth;
	}
}

class GraphOverlay{
	constructor(GivenProperties = {}){
		let PropertiesTemplate = {
			"Position": {

			}
		};

		Object.defineProperties(PropertiesTemplate.Position, {
			"X":{
				"get": function(){
					return this.__XPos__;
				},
				"set": function(Scope, Value){
					Value |= 0;
					let Difference = this.__XPos__ - Value;
					this.__XPos__ = Value;
					const Rectangles = Scope.Rectangles;
					for(let i = 0, Length = Rectangles.length; i < Length; i++){
						Rectangles[i].position.x += Difference;
					}
				}.BindArgs(this)
			},
			"Y":{
				"get": function(){
					return this.__YPos__;
				},
				"set": function(Scope, Value){
					Value |= 0;
					let Difference = this.__YPos__ - Value;
					this.__YPos__ = Value;
					const Rectangles = Scope.Rectangles;
					for(let i = 0, Length = Rectangles.length; i < Length; i++){
						Rectangles[i].position.y += Difference;
					}
				}.BindArgs(this)
			}
		});

		Object.defineProperties(PropertiesTemplate, {
			"ZIndex":{
				"get": function(){
					return this.__ZIndex__;
				},
				"set": function(Scope, Value){
					this.__ZIndex__ = Value;
					Scope.Renderer.view.style.zIndex = Value;
				}.BindArgs(this)
			},
			"Colour":{
				"get": function(){
					return this.__Colour__;
				},
				"set": function(Scope, Value){
					this.__Colour__ = Value;
					const Rectangles = Scope.Rectangles;
					for(let i = 0, Length = Rectangles.length; i < Length; i++){
						Rectangles[i].tint = Value;
					}
					//Scope.Changed = true;
				}.BindArgs(this)
			},
			"Alpha":{
				"get": function(){
					return this.__Alpha__;
				},
				"set": function(Scope, Value){
					this.__Alpha__ = Value;
					const Rectangles = Scope.Rectangles;
					for(let i = 0, Length = Rectangles.length; i < Length; i++){
						Rectangles[i].alpha = Value;
					}
					//Scope.Changed = true;
				}.BindArgs(this)
			},
			"ColumnWidth":{
				"get": function(){
					return this.__ColumnWidth__;
				},
				"set": function(Scope, Value){
					this.__ColumnWidth__ = Value;
					const Rectangles = Scope.Rectangles;
					const Offset = this.Position.X;
					for(let i = 0, Length = Rectangles.length; i < Length; i++){
						const Rectangle = Rectangles[i];
						Rectangle.width = Value;
						Rectangle.position.x = Offset + i * Value;
					}
					//Scope.Changed = true;
				}.BindArgs(this)
			},
			"MaxHeight":{
				"get": function(Scope){
					return this.__MaxHeight__;
				}.BindArgs(this),
				"set": function(Scope, Value){
					Scope.Renderer.view.style.height = Value + "px";
					Scope.Renderer.view.height = Value;
					this.__MaxHeight__ = Value;
					//Scope.Changed = true;
				}.BindArgs(this)
			},
			"MaxWidth":{
				"get": function(Scope){
					return this.__MaxWidth__;
				}.BindArgs(this),
				"set": function(Scope, Value){
					Scope.Renderer.view.style.width = Value + "px";
					Scope.Renderer.view.width = Value;
					this.__MaxWidth__ = Value;
					//Scope.Changed = true;
				}.BindArgs(this)
			},
			"ParentElement":{
				"get": function(){
					return this.__ParentElement__;
				},
				"set": function(Scope, Value){
					this.__ParentElement__ = Value;
					//I won't bother checking whether this was set already, etc.
					console.log(Value);
					Value.appendChild(Scope.Renderer.view);
				}.BindArgs(this)
			},
			"MaxDataPoints":{
				"get": function(){
					return this.__MaxDataPoints__;
				},
				"set": function(Scope, Value){
					this.__MaxDataPoints__ |= 0;
					/*if(Value === this.__MaxDataPoints__) return true;
					else*/ if(Value < 0) return false;
					else if(Value >= this.__MaxDataPoints__){ //Add
						let Difference = Value - this.__MaxDataPoints__;
						Scope.Data.splice(0, 0, ...new Array(Difference));
						for(let i = 0; i < Difference; i++){
							Scope.Rectangles.splice(0, 0, new PIXI.Sprite(Scope.Texture));
							Scope.Container.addChild(Scope.Rectangles[0]);
							Scope.Rectangles[0].height = 0;
						}
						//vv This refreshes the sprite properties.
						this.Position.X = this.Position.__XPos__;
						this.Position.Y = this.Position.__YPos__;
						this.Colour = this.__Colour__;
						this.Alpha = this.__Alpha__;
						this.ColumnWidth = this.__ColumnWidth__;
						this.MaxHeight = this.__MaxHeight__;
						this.MaxWidth = this.__MaxWidth__;
					} else{ //Remove
						let Difference = this.__MaxDataPoints__ - Value;
						this.Data.splice(0, Difference);
						//this.Rectangles.splice(0, Difference);
					}
					this.__MaxDataPoints__ = Value;
					Scope.Changed = true;
				}.BindArgs(this)
			}
		});


		let DefaultProperties = { //The default properties.
			"Position":{
				"X": 0,
				"Y": 0
			},
			"ZIndex": 2500,
			"Colour": 0x007fff,
			"Alpha": 0.75,
			"ColumnWidth": 1,
			"MaxHeight": 1000, //These values will be adjusted automatically if the parent DOM element has smaller dimensions.
			"MaxWidth": 1000,
			"ParentElement": document.getElementsByTagName("body")[0], //This must be defined by the user!
			"MaxDataPoints": 300
		};

		this.Data = [];//[1, 2, 5, 4, 6, 4, 3, 2, 5, 4, 6, 4, 2, 1, 5];

		this.Application = new PIXI.Application();

		this.Stage = this.Application.stage;
		this.Renderer = new PIXI.autoDetectRenderer({"transparent": true, "width": 1920, "height": 1080});

		document.getElementsByTagName("body")[0].appendChild(this.Renderer.view);

		this.Renderer.view.style.pointerEvents = "none";
		this.Renderer.view.style.position = "absolute";

		this.Texture = PIXI.Texture.WHITE;
		this.Container = new PIXI.ParticleContainer(1024, undefined, undefined, true);
		this.Stage.addChild(this.Container);
		this.Rectangles = [];
		/*for(let i = 0; i < 1024; i++){
			let Rectangle = new PIXI.Sprite(this.Texture);
			Rectangle.tint = 0x007fff;
			Rectangle.alpha = 0.5;
			Rectangle.width = 1;
			Rectangle.height = 10;
			Rectangle.position.x = i;
			Rectangle.position.y = 10;
			this.Container.addChild(Rectangle);
			this.Rectangles.push(Rectangle);
		}*/

		//this.InitialiseHTML();

		this.Properties = Utilities.MergeObjects(GivenProperties, DefaultProperties, PropertiesTemplate);

		this.Properties.MaxDataPoints = this.Properties.MaxDataPoints;


		//There is a strange bug that I don't know how to fix properly, so here we go...
		for(let i = 0; i < 1024; i++){
			this.Data.AddItems(/*Math.random() * 20*/100).shift();
		}
		setTimeout(function(){
			for(let i = 0; i < 1024; i++){
				this.Data.AddItems(/*Math.random() * 20*/0).shift();
			}
		}.bind(this), 50);



		//this.Properties.ParentElement.appendChild(this.DOMElement);

		this.Changed = true;
		this.Update();
	}
	InitialiseHTML(){
		this.DOMElement.style.position = "absolute";
	}
	__AddItems(...Items){
		//this.Data.slice(0, Math.min(Items.length, this.Properties.MaxDataPoints));
		//Items = Items.slice(Math.max(this.Properties.MaxDataPoints - Items.length, 0));
		//this.Data.push(...Items);
		this.Data.AddItems(Items[0]).shift();
		this.Changed = true;
	}
	AddItem(Item){
		this.Data.AddItems(Item).shift();
		this.Changed = true;
	}
	Update(){
		window.requestAnimationFrame(function(){
			this.Update();
		}.bind(this));
		//if(!this.Changed) return;
		//this.Changed = false;

		//for(let i = 0; i < 1000; i++) PW.DrawRectangles(this.Graphics, 0x007fff, [{"X": 10, "Y": 22}], [{"W": 45, "H": 16}]);

		/*this.Graphics.clear();
		this.Graphics.beginFill(0x007fff, .5);

		for(let i = 0; i < 10000; i++){
			let x = Math.random() * 1000;
			let y = Math.random() * 1000;
			this.Graphics.drawRect(x, y, 10, 10);
		}*/


		/*for(let i = 0, Length = this.Rectangles.length; i < Length; i++){
			const Rectangle = this.Rectangles[i];
			Rectangle.position.x = Math.random() * 1000;
			Rectangle.position.y = 10;
			Rectangle.width = 10;
			Rectangle.height = 10;
			Rectangle.color = 0x007fff;
		}*/
		const Height = window.innerHeight;
		this.Properties.MaxHeight = Height;

		let Max = 100;
		let Min = 0; //Min will stay 0 for now.
		for(let i = 0, Length = this.Data.length; i < Length; i++){
			this.Data[i] ??= 0;
			if(Max < this.Data[i]) Max = this.Data[i];
		}


		for(let i = 0, Length = this.Rectangles.length; i < Length; i++){
			const Rectangle = this.Rectangles[i];
			const Data = this.Data[i] ?? 0;
			const FractionOfMax = this.Data[i] / Max;
			//Rectangle.tint = 0x007fff;
			//Rectangle.alpha = 0.5;
			//Rectangle.width = 1;
			Rectangle.height = FractionOfMax * Height;
			//Rectangle.position.x = i;
			Rectangle.position.y = (1 - FractionOfMax) * Height;
		}


		this.Renderer.render(this.Stage);


		/*let Height = this.DOMElement.clientHeight;
		let Width = this.DOMElement.clientWidth;
		this.Properties.MaxHeight = Height;
		this.Properties.MaxWidth = Width;

		let Max = 100;
		let Min = 0; //Min will stay 0 for now.
		for(let i = 0, Length = this.Data.length; i < Length; i++){
			this.Data[i] ??= 0;
			if(Max < this.Data[i]) Max = this.Data[i];
		}
		for(let i = 0, Length = this.ColumnDOMElements.length; i < Length; i++){
			let OffsetLeft = this.Properties.Position.X + i * this.Properties.ColumnWidth;
			let FractionOfMax = this.Data[i] / Max;

			this.ColumnDOMElements[i].style.left = OffsetLeft + "px";
			this.ColumnDOMElements[i].style.height = FractionOfMax * Height + "px";
			this.ColumnDOMElements[i].style.top = (1 - FractionOfMax) * Height + "px";
		}*/
	}
}

class PerformanceOverlay{
	constructor(){
		this.Graph = new GraphOverlay;
		this.ZIndex = this.Graph.Properties.ZIndex + 1;
		this.Wrapper = document.createElement("div");
		document.getElementsByTagName("body")[0].appendChild(this.Wrapper);
		this.Wrapper.style.zIndex = this.ZIndex;
		this.Wrapper.classList.add("DebugInfoOverlayWrapper");
		this.Info = [];
		this.AddInfo([
			function(){
				return "Permille.io " + Application.Version + " [" + Application.Build + "]";
			},
			function(){
        if(typeof process !== "undefined") return "Running on Electron " + process.versions.electron + ", " + "Node " + process.versions.node + ", " + "Chrome " + process.versions.chrome;
        else return navigator.userAgent;
			},
			function(){
				return "";
			},
			function(){
				const Camera = Application.Main.Renderer.Camera;
				return "Position: " + Math.round(Camera.position.x * 1000) / 1000 + " X, " + Math.round(Camera.position.y * 1000) / 1000 + " Y, " + Math.round(Camera.position.z * 1000) / 1000 + " Z";
			},
			function(){
				return "";
			},
			function(){
				return Math.round(1000 / Application.Main.Renderer.RenderTime) + " fps (" + Application.Main.Renderer.GeometryDataGenerator.PendingAddGeometryDataRequests + " PADRs, " + Application.Main.Renderer.GeometryDataGenerator.PendingAddVirtualGeometryDataRequests + " PAVDRs)";
			},
			function(){
				const PerformanceInfo = Application.Main.Renderer.Renderer.info;
				return "Geometries: " + PerformanceInfo.memory.geometries + ", Draw calls: " + PerformanceInfo.render.calls;
			},
			function(){
				const PerformanceInfo = Application.Main.Renderer.Renderer.info;
				return "Triangles: " + PerformanceInfo.render.triangles;
			}
		]);
		document.addEventListener("keydown", function(Event){
			if(Event.key === "F3"){
		    Event.preventDefault();
		    this.ToggleVisibility();
			}
		}.bind(this));
		window.requestAnimationFrame(function(){
			this.Update();
		}.bind(this));
	}
	AddInfo(Functions){
		for(let i = 0, Length = Functions.length; i < Length; i++){

			let TextElement = document.createElement("p");
			this.Wrapper.appendChild(TextElement);
			this.Wrapper.appendChild(document.createElement("br"));

			this.Info.push({"Function": Functions[i], "TextElement": TextElement});
		}
	}
	ToggleVisibility(){
		if(this.Wrapper.style.display === "none"){
			this.Wrapper.style.display = "block";
			this.Graph.Renderer.view.style.display = "block";
		}
		else{
			this.Wrapper.style.display = "none";
			this.Graph.Renderer.view.style.display = "none";
		}
	}
	Update(){
		window.requestAnimationFrame(function(){
			this.Update();
		}.bind(this));

		for(let i = 0, Length = this.Info.length; i < Length; i++){
			this.Info[i].TextElement.innerHTML = this.Info[i].Function();
		}
	}
}
/*
// https://medium.com/@luruke/simple-postprocessing-in-three-js-91936ecadfb7
//  To use it, simply declare:
//  `const post = new PostFX(rendering);`
//
//  Then on update, instead of:
//  `rendering.render(scene, camera);`
//  replace with:
//  `post.render(scene, camera);`
import {
  WebGLRenderTarget,
  OrthographicCamera,
  RGBFormat,
  BufferGeometry,
  BufferAttribute,
  Mesh,
  Scene,
  RawShaderMaterial,
  Vector2,
} from 'three';

const vertexShader = `precision highp float;
attribute vec2 position;

void main() {
  // Look ma! no projection matrix multiplication,
  // because we pass the values directly in clip space coordinates.
  gl_Position = vec4(position, 1.0, 1.0);
}`;

const fragmentShader = `precision highp float;
uniform sampler2D uScene;
uniform vec2 uResolution;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec3 color = vec3(uv, 1.0);
  color = texture2D(uScene, uv).rgb;

  // Do your cool postprocessing here
  color.r += sin(uv.x * 50.0);

  gl_FragColor = vec4(color, 1.0);
}`;

class PostFX {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new Scene();
    // three.js for .render() wants a camera, even if we're not using it :(
    this.dummyCamera = new OrthographicCamera();
    this.geometry = new BufferGeometry();

    // Triangle expressed in clip space coordinates
    const vertices = new Float32Array([
      -1.0, -1.0,
      3.0, -1.0,
      -1.0, 3.0
    ]);

    this.geometry.addAttribute('position', new BufferAttribute(vertices, 2));

    this.resolution = new Vector2();
    this.renderer.getDrawingBufferSize(this.resolution);

    this.target = new WebGLRenderTarget(this.resolution.x, this.resolution.y, {
      format: RGBFormat,
      stencilBuffer: false,
      depthBuffer: true,
    });

    this.material = new RawShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        uScene: { value: this.target.texture },
        uResolution: { value: this.resolution },
      },
    });

    // TODO: handle the resize -> update uResolution uniform and this.target.setSize()

    this.triangle = new Mesh(this.geometry, this.material);
    // Our triangle will be always on screen, so avoid frustum culling checking
    this.triangle.frustumCulled = false;
    this.scene.add(this.triangle);
  }

  render(scene, camera) {
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.dummyCamera);
  }
}
*/

class Test{
	constructor(){
		this.CanvasElement = document.createElement("canvas");
		this.Ctx = this.CanvasElement.getContext("2d");
		this.CanvasElement.style.zIndex = 10101;
		this.CanvasElement.style.pointerEvents = "none";
		this.CanvasElement.style.position = "absolute";
		this.CanvasElement.style.width = "1024px";
		this.CanvasElement.style.height = "1024px";
		this.CanvasElement.width = 1024;
		this.CanvasElement.height = 1024;
		this.MouseX = 0;
		this.MouseY = 0;
		document.getElementsByTagName("body")[0].appendChild(this.CanvasElement);
		document.addEventListener("mousemove", function(e){
			this.MouseX = (window.Event) ? e.pageX : event.clientX + (document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft);
			this.MouseY = (window.Event) ? e.pageY : event.clientY + (document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop);
			this.Changed = true;
			console.log(this.MouseX + ", " + this.MouseY);
		}.bind(this));
		this.Changed = true;
		this.Update();
	}
	Update(Depth = 5, PLastXMin = Infinity, PLastXMax = -Infinity, PLastYMin = Infinity, PLastYMax = -Infinity){
		if(PLastXMin === Infinity){
			window.requestAnimationFrame(function(){
				this.Update();
			}.bind(this));
			if(!this.Changed) return;
			CanvasDrawing.DrawTransparentRectangle(0, 0, 1024, 1024, this.Ctx);
		}


		const Size = 128 / (2 ** Depth);
		const Power = 2 ** Depth;
		const ReversePower = 2 ** (7 - Depth);
		const ThisX = Math.floor(this.MouseX / ReversePower);
		const ThisY = Math.floor(this.MouseY / ReversePower);
		const PThisXMin = Math.ceil((ThisX - 4) / 2) * 2, PThisXMax = Math.ceil((ThisX + 4) / 2) * 2;
		const PThisYMin = Math.ceil((ThisY - 4) / 2) * 2, PThisYMax = Math.ceil((ThisY + 4) / 2) * 2;
		for(let i = (PThisXMin < 0) ? 0 : PThisXMin; i < ((PThisXMax > 2 ** 10) ? 2 ** 10 : PThisXMax); i++){
			for(let j = (PThisYMin < 0) ? 0 : PThisYMin; j < ((PThisYMax > 2 ** 10) ? 2 ** 10 : PThisYMax); j++){
				if(PLastXMin / 2 <= i && PLastXMax / 2 > i && PLastYMin / 2 <= j && PLastYMax / 2 > j) continue;
				CanvasDrawing.DrawRectangle(i * Size + 1, j * Size + 1, Size - 2, Size - 2, "hsla(" + (60 * (Depth - 1)) + ", 50%, 70%, 0.5)", this.Ctx, false);
			}
		}
		if(Depth > 0) this.Update(--Depth, PThisXMin, PThisXMax, PThisYMin, PThisYMax);
		else this.Changed = false;
	}
	__Update(){
		window.requestAnimationFrame(function(){
			this.Update();
		}.bind(this));
		if(!this.Changed) return;
		this.Changed = false;
		CanvasDrawing.DrawTransparentRectangle(0, 0, 1024, 1024, this.Ctx);

		if(false){ //This works.
			for(let i = 0; i < 8; i++){
				for(let j = 0; j < 8; j++){
					CanvasDrawing.DrawRectangle(i * 128 + 1, j * 128 + 1, 126, 126, "hsla(" + 0 + ", 50%, 70%, 0.5)", this.Ctx, false);
				}
			}

			const SecondX = Math.floor(this.MouseX / 64);
			const SecondY = Math.floor(this.MouseY / 64);
			for(let PXMin = Math.ceil((SecondX - 4) / 2) * 2, PXMax = Math.ceil((SecondX + 4) / 2) * 2, i = (PXMin < 0) ? 0 : PXMin; i < ((PXMax > 16) ? 16 : PXMax); i++){
				for(let PYMin = Math.ceil((SecondY - 4) / 2) * 2, PYMax = Math.ceil((SecondY + 4) / 2) * 2, j = (PYMin < 0) ? 0 : PYMin; j < ((PYMax > 16) ? 16 : PYMax); j++){
					CanvasDrawing.DrawRectangle(i * 64 + 1, j * 64 + 1, 62, 62, "hsla(" + 60 + ", 50%, 70%, 0.5)", this.Ctx, false);
				}
			}
			const ThirdX = Math.floor(this.MouseX / 32);
			const ThirdY = Math.floor(this.MouseY / 32);
			for(let PXMin = Math.ceil((ThirdX - 4) / 2) * 2, PXMax = Math.ceil((ThirdX + 4) / 2) * 2, i = (PXMin < 0) ? 0 : PXMin; i < ((PXMax > 32) ? 32 : PXMax); i++){
				for(let PYMin = Math.ceil((ThirdY - 4) / 2) * 2, PYMax = Math.ceil((ThirdY + 4) / 2) * 2, j = (PYMin < 0) ? 0 : PYMin; j < ((PYMax > 32) ? 32 : PYMax); j++){
					CanvasDrawing.DrawRectangle(i * 32 + 1, j * 32 + 1, 30, 30, "hsla(" + 120 + ", 50%, 70%, 0.5)", this.Ctx, false);
				}
			}
			const FourthX = Math.floor(this.MouseX / 16);
			const FourthY = Math.floor(this.MouseY / 16);
			for(let PXMin = Math.ceil((FourthX - 4) / 2) * 2, PXMax = Math.ceil((FourthX + 4) / 2) * 2, i = (PXMin < 0) ? 0 : PXMin; i < ((PXMax > 64) ? 64 : PXMax); i++){
				for(let PYMin = Math.ceil((FourthY - 4) / 2) * 2, PYMax = Math.ceil((FourthY + 4) / 2) * 2, j = (PYMin < 0) ? 0 : PYMin; j < ((PYMax > 64) ? 64 : PYMax); j++){
					CanvasDrawing.DrawRectangle(i * 16 + 1, j * 16 + 1, 14, 14, "hsla(" + 180 + ", 50%, 70%, 0.5)", this.Ctx, false);
				}
			}
			const FifthX = Math.floor(this.MouseX / 8);
			const FifthY = Math.floor(this.MouseY / 8);
			for(let PXMin = Math.ceil((FifthX - 4) / 2) * 2, PXMax = Math.ceil((FifthX + 4) / 2) * 2, i = (PXMin < 0) ? 0 : PXMin; i < ((PXMax > 128) ? 128 : PXMax); i++){
				for(let PYMin = Math.ceil((FifthY - 4) / 2) * 2, PYMax = Math.ceil((FifthY + 4) / 2) * 2, j = (PYMin < 0) ? 0 : PYMin; j < ((PYMax > 128) ? 128 : PYMax); j++){
					CanvasDrawing.DrawRectangle(i * 8 + 1, j * 8 + 1, 6, 6, "hsla(" + 240 + ", 50%, 70%, 0.5)", this.Ctx, false);
				}
			}
		}

		const FifthX = Math.floor(this.MouseX / 8);
		const FifthY = Math.floor(this.MouseY / 8);
		const PFifthXMin = Math.ceil((FifthX - 4) / 2) * 2, PFifthXMax = Math.ceil((FifthX + 4) / 2) * 2;
		const PFifthYMin = Math.ceil((FifthY - 4) / 2) * 2, PFifthYMax = Math.ceil((FifthY + 4) / 2) * 2;
		for(let i = (PFifthXMin < 0) ? 0 : PFifthXMin; i < ((PFifthXMax > 128) ? 128 : PFifthXMax); i++){
			for(let j = (PFifthYMin < 0) ? 0 : PFifthYMin; j < ((PFifthYMax > 128) ? 128 : PFifthYMax); j++){
				CanvasDrawing.DrawRectangle(i * 8 + 1, j * 8 + 1, 6, 6, "hsla(" + 240 + ", 50%, 70%, 0.5)", this.Ctx, false);
			}
		}

		const FourthX = Math.floor(this.MouseX / 16);
		const FourthY = Math.floor(this.MouseY / 16);
		const PFourthXMin = Math.ceil((FourthX - 4) / 2) * 2, PFourthXMax = Math.ceil((FourthX + 4) / 2) * 2;
		const PFourthYMin = Math.ceil((FourthY - 4) / 2) * 2, PFourthYMax = Math.ceil((FourthY + 4) / 2) * 2;
		for(let i = (PFourthXMin < 0) ? 0 : PFourthXMin; i < ((PFourthXMax > 64) ? 64 : PFourthXMax); i++){
			for(let j = (PFourthYMin < 0) ? 0 : PFourthYMin; j < ((PFourthYMax > 64) ? 64 : PFourthYMax); j++){
				if(PFifthXMin / 2 <= i && PFifthXMax / 2 > i && PFifthYMin / 2 <= j && PFifthYMax / 2 > j) continue;
				CanvasDrawing.DrawRectangle(i * 16 + 1, j * 16 + 1, 14, 14, "hsla(" + 180 + ", 50%, 70%, 0.5)", this.Ctx, false);
			}
		}

		const ThirdX = Math.floor(this.MouseX / 32);
		const ThirdY = Math.floor(this.MouseY / 32);
		const PThirdXMin = Math.ceil((ThirdX - 4) / 2) * 2, PThirdXMax = Math.ceil((ThirdX + 4) / 2) * 2;
		const PThirdYMin = Math.ceil((ThirdY - 4) / 2) * 2, PThirdYMax = Math.ceil((ThirdY + 4) / 2) * 2;
		for(let i = (PThirdXMin < 0) ? 0 : PThirdXMin; i < ((PThirdXMax > 32) ? 32 : PThirdXMax); i++){
			for(let j = (PThirdYMin < 0) ? 0 : PThirdYMin; j < ((PThirdYMax > 32) ? 32 : PThirdYMax); j++){
				if(PFourthXMin / 2 <= i && PFourthXMax / 2 > i && PFourthYMin / 2 <= j && PFourthYMax / 2 > j) continue;
				CanvasDrawing.DrawRectangle(i * 32 + 1, j * 32 + 1, 30, 30, "hsla(" + 120 + ", 50%, 70%, 0.5)", this.Ctx, false);
			}
		}
		const SecondX = Math.floor(this.MouseX / 64);
		const SecondY = Math.floor(this.MouseY / 64);
		const PSecondXMin = Math.ceil((SecondX - 4) / 2) * 2, PSecondXMax = Math.ceil((SecondX + 4) / 2) * 2;
		const PSecondYMin = Math.ceil((SecondY - 4) / 2) * 2, PSecondYMax = Math.ceil((SecondY + 4) / 2) * 2;
		for(let i = (PSecondXMin < 0) ? 0 : PSecondXMin; i < ((PSecondXMax > 16) ? 16 : PSecondXMax); i++){
			for(let j = (PSecondYMin < 0) ? 0 : PSecondYMin; j < ((PSecondYMax > 16) ? 16 : PSecondYMax); j++){
				if(PThirdXMin / 2 <= i && PThirdXMax / 2 > i && PThirdYMin / 2 <= j && PThirdYMax / 2 > j) continue;
				CanvasDrawing.DrawRectangle(i * 64 + 1, j * 64 + 1, 62, 62, "hsla(" + 60 + ", 50%, 70%, 0.5)", this.Ctx, false);
			}
		}

		const FirstX = Math.floor(this.MouseX / 128);
		const FirstY = Math.floor(this.MouseY / 128);
		const PFirstXMin = Math.ceil((FirstX - 4) / 2) * 2, PFirstXMax = Math.ceil((FirstX + 4) / 2) * 2;
		const PFirstYMin = Math.ceil((FirstY - 4) / 2) * 2, PFirstYMax = Math.ceil((FirstY + 4) / 2) * 2;
		for(let i = (PFirstXMin < 0) ? 0 : PFirstXMin; i < ((PFirstXMax > 8) ? 8 : PFirstXMax); i++){
			for(let j = (PFirstYMin < 0) ? 0 : PFirstYMin; j < ((PFirstYMax > 8) ? 8 : PFirstYMax); j++){
				if(PSecondXMin / 2 <= i && PSecondXMax / 2 > i && PSecondYMin / 2 <= j && PSecondYMax / 2 > j) continue;
				CanvasDrawing.DrawRectangle(i * 128 + 1, j * 128 + 1, 126, 126, "hsla(" + 0 + ", 50%, 70%, 0.5)", this.Ctx, false);
			}
		}





		/*const ThirdX = Math.round(this.MouseX / 32);
		const ThirdY = Math.round(this.MouseY / 32);
		for(let i = (ThirdX < 4) ? 0 : ThirdX - 4; i < ((ThirdX > 32 - 4) ? 32 : ThirdX + 4); i++){
			for(let j = (ThirdY < 4) ? 0 : ThirdY - 4; j < ((ThirdY > 32 - 4) ? 32 : ThirdY + 4); j++){
				CanvasDrawing.DrawRectangle(i * 32 + 1, j * 32 + 1, 30, 30, "hsla(" + 120 + ", 50%, 70%, 0.5)", this.Ctx, false);
			}
		}
		const FourthX = Math.round(this.MouseX / 16);
		const FourthY = Math.round(this.MouseY / 16);
		for(let i = (FourthX < 4) ? 0 : FourthX - 4; i < ((FourthX > 64 - 4) ? 64 : FourthX + 4); i++){
			for(let j = (FourthY < 4) ? 0 : FourthY - 4; j < ((FourthY > 64 - 4) ? 64 : FourthY + 4); j++){
				CanvasDrawing.DrawRectangle(i * 16 + 1, j * 16 + 1, 14, 14, "hsla(" + 180 + ", 50%, 70%, 0.5)", this.Ctx, false);
			}
		}
		const FifthX = Math.round(this.MouseX / 8);
		const FifthY = Math.round(this.MouseY / 8);
		for(let i = (FifthX < 4) ? 0 : FifthX - 4; i < ((FifthX > 128 - 4) ? 128 : FifthX + 4); i++){
			for(let j = (FifthY < 4) ? 0 : FifthY - 4; j < ((FifthY > 128 - 4) ? 128 : FifthY + 4); j++){
				CanvasDrawing.DrawRectangle(i * 8 + 1, j * 8 + 1, 6, 6, "hsla(" + 240 + ", 50%, 70%, 0.5)", this.Ctx, false);
			}
		}*/
	}
};
