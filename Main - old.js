setTimeout(function(){Application.Initialise();}, 1);
class Application{
	static Version = "Alpha 0.1.3";
	static Build = "17";

	static Initialise(){
		(DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.warn("Hey");
		this.TextureMap = new THREE.TextureLoader().load("./75d16862-8356-4a06-80f5-96785314ab73/Atlas.png", function(){
			setTimeout(function(){
				this.Main = new Main(this);
			}.bind(this), 0); // This is for debugging bugs that occur when the program first starts.
		}.bind(this));
	}
}

class Main{
	constructor(Application){
		(DEBUG_LEVEL <= DEBUG_LEVELS.INFO) && console.time("Initialisation");
		this.Application = Application;
		this.Game = new Game(this);


		(DEBUG_LEVEL <= DEBUG_LEVELS.INFO) && console.timeEnd("Initialisation");
	}
}

class Renderer{
	/*static WATER_MESH = */

	constructor(Game){
		this.Game = Game;

		this.DebugInfoOverlay = new DebugInfoOverlay;
		this.RenderTime = 10;

		this.Scene = new THREE.Scene();
		this.Scene.background = new THREE.Color("#7fffff");
		const scene = new THREE.Scene();

  	this.Scene.fog = new THREE.FogExp2(0x7fffff, 0.0002);

		this.TextureLoader = new THREE.TextureLoader();
		this.TextureMap = Application.TextureMap;
		//this.TextureMap = new THREE.TextureLoader().load("./75d16862-8356-4a06-80f5-96785314ab73/Atlas.png"); //##################  No callback!
		this.TextureMap.magFilter = THREE.NearestFilter;
		this.TextureMap.minFilter = THREE.NearestFilter;


		this.Renderer = new THREE.WebGLRenderer();
		this.Renderer.setSize(window.innerWidth, window.innerHeight);

		//this.Renderer.shadowMap.enabled = true;

		this.Renderer.autoClear = false;

		this.Camera = new THREE.PerspectiveCamera(110, window.innerWidth / window.innerHeight, 0.1, 100000);
		this.Camera.rotation.order = "YXZ";

		this.Renderer.domElement.style.zIndex = 1000;
		this.Renderer.domElement.style.position = "absolute"; //Todo: Make a storage system for all canvas elements.

		document.getElementsByTagName("body")[0].appendChild(this.Renderer.domElement);

		window.addEventListener("resize", function(){
			this.Renderer.setSize(window.innerWidth, window.innerHeight);
			this.Camera.aspect = window.innerWidth / window.innerHeight;
			this.Camera.updateProjectionMatrix();
			this.Camera.rotation.order = "YXZ";
		}.bind(this));




		//this.AddLight(30, 100, 30, .5);
		//this.AddLight(-30, -100, -30, .25);
		//this.AddLight(-100, 0, -100, .75);
		this.AddLight(0, 0, 100, .35);
		this.AddLight(100, 0, 0, .5);
		this.AddLight(0, 100, 0, .65);
		//this.AddLight(50, 0, 0, .75);
		//this.AddBetterLight(0, 190, 0, 0xffffff, 1, 0);


		this.WorkerGeometryDataGenerator;
		this.InitialiseWorker();

		this.LastRender = window.performance.now(); //Not really, but just a nice fallback for premature calls. This will be adjusted when the next frame is rendered.
		this.PendingAddGeometryDataRequests = 0;
		this.PendingAddVirtualGeometryDataRequests = 0;
		window.requestAnimationFrame(function(){
			this.Render();
		}.bind(this));
	}

	InitialiseWorker(){
		this.WorkerGeometryDataGenerator = new Worker(__ScriptPath__ + "/WorkerGeometryDataGenerator.js");

		this.WorkerGeometryDataGenerator.addEventListener("error", function(e) {
		    (DEBUG_LEVEL <= DEBUG_LEVELS.WARNING) && console.warn("Worker error:", e);
		});
		this.WorkerGeometryDataGenerator.addEventListener("messageerror", function(e) {
		    (DEBUG_LEVEL <= DEBUG_LEVELS.WARNING) && console.warn("Message error:", e);
		});

		this.WorkerGeometryDataGenerator.addEventListener("message", function(Event){
			if(Event.data.Request === "SaveGeometryData"){
				this.AddGeometryData(false, Event.data.Opaque.Positions, Event.data.Opaque.Normals, Event.data.Opaque.Indices, Event.data.Opaque.UVs, Event.data.URegionX, Event.data.URegionY, Event.data.URegionZ, Event.data.CommonBlock, this.TextureMap, function(Mesh){
					const SelectedRegion = Application.Main.Game.World.Regions[Event.data.URegionX][Event.data.URegionY][Event.data.URegionZ];
					SelectedRegion.OpaqueMesh = Mesh;
					SelectedRegion.LoadState = Region.LOAD_STATE_GENERATED_MESH;
					(DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.debug("[" + (window.performance.now() >> 0) + "] Added opaque geometry data at " + Event.data.URegionX + ", " + Event.data.URegionY + ", " + Event.data.URegionZ);

				}.bind(this));
				this.AddGeometryData(true, Event.data.Transparent.Positions, Event.data.Transparent.Normals, Event.data.Transparent.Indices, Event.data.Transparent.UVs, Event.data.URegionX, Event.data.URegionY, Event.data.URegionZ, Event.data.CommonBlock, this.TextureMap, function(Mesh){
					const SelectedRegion = Application.Main.Game.World.Regions[Event.data.URegionX][Event.data.URegionY][Event.data.URegionZ];
					SelectedRegion.TransparentMesh = Mesh;
					SelectedRegion.LoadState = Region.LOAD_STATE_GENERATED_MESH;
					(DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.debug("[" + (window.performance.now() >> 0) + "] Added transparent geometry data at " + Event.data.URegionX + ", " + Event.data.URegionY + ", " + Event.data.URegionZ);
				}.bind(this));
				///There is a rare instance where the meshes get added after the data for the region has been deleted. This has mostly been fixed, but still happens sometimes.
				(DEBUG_LEVEL <= DEBUG_LEVELS.DEBUGGER) && console.debug("[" + (window.performance.now() >> 0) + "] Queued adding geometry data at " + Event.data.URegionX + ", " + Event.data.URegionY + ", " + Event.data.URegionZ + ". Currently, the queue is " + this.PendingAddGeometryDataRequests + " places long.");
			} else if(Event.data.Request === "SaveVirtualGeometryData"){
				this.AddVirtualGeometryData(false, Event.data.Opaque.Positions, Event.data.Opaque.Normals, Event.data.Opaque.Indices, Event.data.Opaque.UVs, Event.data.URegionX, Event.data.URegionY, Event.data.URegionZ, Event.data.Depth, Event.data.CommonBlock, this.TextureMap, function(Mesh){
					const SelectedVirtualRegion = Application.Main.Game.World.VirtualRegions[Event.data.Depth][Event.data.URegionX][Event.data.URegionY][Event.data.URegionZ];
					SelectedVirtualRegion.OpaqueMesh = Mesh;
					SelectedVirtualRegion.LoadState = Region.LOAD_STATE_GENERATED_MESH;
					(DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.debug("[" + (window.performance.now() >> 0) + "] Added opaque virtual geometry data with depth " + Event.data.Depth + " at " + Event.data.URegionX + ", " + Event.data.URegionY + ", " + Event.data.URegionZ);
				}.bind(this));
				this.AddVirtualGeometryData(true, Event.data.Transparent.Positions, Event.data.Transparent.Normals, Event.data.Transparent.Indices, Event.data.Transparent.UVs, Event.data.URegionX, Event.data.URegionY, Event.data.URegionZ, Event.data.Depth, Event.data.CommonBlock, this.TextureMap, function(Mesh){
					const SelectedVirtualRegion = Application.Main.Game.World.VirtualRegions[Event.data.Depth][Event.data.URegionX][Event.data.URegionY][Event.data.URegionZ];
					SelectedVirtualRegion.TransparentMesh = Mesh;
					SelectedVirtualRegion.LoadState = Region.LOAD_STATE_GENERATED_MESH;
					(DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.debug("[" + (window.performance.now() >> 0) + "] Added transparent virtual geometry data with depth " + Event.data.Depth + " at " + Event.data.URegionX + ", " + Event.data.URegionY + ", " + Event.data.URegionZ);
				}.bind(this));
				///There is a rare instance where the meshes get added after the data for the region has been deleted. This has mostly been fixed, but still happens sometimes.
				(DEBUG_LEVEL <= DEBUG_LEVELS.DEBUGGER) && console.debug("[" + (window.performance.now() >> 0) + "] Queued adding virtual geometry data with depth " + Event.data.Depth + " at " + Event.data.URegionX + ", " + Event.data.URegionY + ", " + Event.data.URegionZ + ". Currently, the queue is " + this.PendingAddGeometryDataRequests + " places long.");
			}
		}.bind(this));
	}

	AddGeometryData(Transparent, Positions, Normals, Indices, UVs, URegionX, URegionY, URegionZ, CommonBlock, TextureMap, Callback, ReCall = false, WaitingSince = window.performance.now()){
		if(Positions.length === 0 || Normals.length === 0 || Indices.length === 0 || UVs.length === 0) return undefined; //This GREATLY improves loading performance!!
		if(this.Game.World.Regions[URegionX]?.[URegionY]?.[URegionZ] === undefined) return; //Region has been deleted while it's been generating.
		if(window.performance.now() - 4 - this.PendingAddGeometryDataRequests / 100 + (WaitingSince - window.performance.now()) / 500 > this.LastRender){ //Add something like WaitingSince
			setTimeout(function(){
				this.AddGeometryData(Transparent, Positions, Normals, Indices, UVs, URegionX, URegionY, URegionZ, CommonBlock, TextureMap, Callback, true, WaitingSince);
			}.bind(this), this.PendingAddGeometryDataRequests + 20);
			if(!ReCall) this.PendingAddGeometryDataRequests++;
			return;
		}

		let Mesh;

		if(Positions.length === 0 || Normals.length === 0 || Indices.length === 0 || UVs.length === 0){
			if(CommonBlock === 4){
				Mesh = new THREE.Mesh(new THREE.PlaneGeometry(1 << SIDE_LENGTH_POWER, 1 << SIDE_LENGTH_POWER), new THREE.MeshPhongMaterial({
					"opacity": 0.75,
					"color": 0x0094ff,
					"transparent": true,
					"alphaTest": 0.05,
					"side": THREE.DoubleSide
				}));
				Mesh.rotation.set(Math.PI / 2, 0, 0);
			}
			else return undefined; //This GREATLY improves loading performance!!
		} else{
			let Geometry = new THREE.BufferGeometry();

			let Material;
			if(Transparent) Material = new THREE.MeshPhongMaterial({
				"map": TextureMap,
				"alphaTest": 0.05,
				"side": THREE.DoubleSide,
				"transparent": true
			});
			else Material = new THREE.MeshPhongMaterial({
				"map": TextureMap,
				"alphaTest": 1,
				"transparent": false/*,
				"color": 0x007fff*/
			});

			Material.castShadow = true;
			Material.receiveShadow = true;



			let PositionNumComponents = 3, NormalNumComponents = 3, UVNumComponents = 2;

			Geometry.setAttribute("position", new THREE.BufferAttribute(new Uint8Array(Positions), PositionNumComponents));
			Geometry.setAttribute("normal", new THREE.BufferAttribute(new Uint8Array(Normals), NormalNumComponents));
			Geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(UVs), UVNumComponents));
			//debugger;

			Geometry.setIndex(Indices);

			Mesh = new THREE.Mesh(Geometry, Material);
		}

		let RegionX = (URegionX << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
		let RegionY = (URegionY << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
		let RegionZ = (URegionZ << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;

		Mesh.position.set(RegionX * Region.SIDE_LENGTH, RegionY * Region.SIDE_LENGTH, RegionZ * Region.SIDE_LENGTH);
		//Mesh.scale.set(0.125, 0.125, 0.125);
		this.Scene.add(Mesh);
		if(ReCall) this.PendingAddGeometryDataRequests--;
		Callback(Mesh);
		return Mesh;
	}

	AddVirtualGeometryData(Transparent, Positions, Normals, Indices, UVs, URegionX, URegionY, URegionZ, Depth, CommonBlock, TextureMap, Callback, ReCall = false, WaitingSince = window.performance.now()){
		//if((URegionX | 0) === 7 && (URegionY | 0) === 2147483647) debugger;

		//if(Depth !== 3) return undefined;
		if(this.Game.World.VirtualRegions[Depth]?.[URegionX]?.[URegionY]?.[URegionZ] === undefined) return; //Region has been deleted while it's been generating.
		//Note that the below line sets the priority for virtual geometry data to be 3x lower than the normal geometry data.
		if(window.performance.now() - 4 - this.PendingAddVirtualGeometryDataRequests / 300 + (WaitingSince - window.performance.now()) / 1500 > this.LastRender){ //Add something like WaitingSince
			setTimeout(function(){
				this.AddVirtualGeometryData(Transparent, Positions, Normals, Indices, UVs, URegionX, URegionY, URegionZ, Depth, CommonBlock, TextureMap, Callback, true, WaitingSince);
			}.bind(this), this.PendingAddVirtualGeometryDataRequests + 20);
			if(!ReCall) this.PendingAddVirtualGeometryDataRequests++;
			return;
		}


		let Mesh;

		if(Positions.length === 0 || Normals.length === 0 || Indices.length === 0 || UVs.length === 0){
			if(CommonBlock === 4){
				Mesh = new THREE.Mesh(new THREE.PlaneGeometry(1 << SIDE_LENGTH_POWER, 1 << SIDE_LENGTH_POWER), new THREE.MeshPhongMaterial({
					"opacity": 0.75,
					"color": 0x0094ff,
					"transparent": true,
					"alphaTest": 0.05,
					"side": THREE.DoubleSide
				}));
				Mesh.rotation.set(Math.PI / 2, 0, 0);
			}
			else return undefined; //This GREATLY improves loading performance!!
		} else{
			let Geometry = new THREE.BufferGeometry();

			let Material;

			if(Transparent) Material = new THREE.MeshPhongMaterial({
				"map": TextureMap,
				"alphaTest": 0.05,
				"side": THREE.DoubleSide,
				"transparent": true
			});
			else Material = new THREE.MeshPhongMaterial({
				"map": TextureMap,
				"alphaTest": 1,
				"transparent": false/*,
				"color": Depth * 32 * 65536 + Depth * 32 * 256 + Depth * 32*/
			});

			Material.castShadow = true;
			Material.receiveShadow = true;



			const PositionNumComponents = 3, NormalNumComponents = 3, UVNumComponents = 2;

			Geometry.setAttribute("position", new THREE.BufferAttribute(new Uint8Array(Positions), PositionNumComponents));
			Geometry.setAttribute("normal", new THREE.BufferAttribute(new Uint8Array(Normals), NormalNumComponents));
			Geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(UVs), UVNumComponents));
			//debugger;

			Geometry.setIndex(Indices);

			Mesh = new THREE.Mesh(Geometry, Material);
		}

		const RegionX = (URegionX << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
		const RegionY = (URegionY << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
		const RegionZ = (URegionZ << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
		const FACTOR = 2 ** (VIRTUAL_REGION_DEPTHS - Depth);
		const SIDE_LENGTH = 1 << SIDE_LENGTH_POWER;
		const SCALE = SIDE_LENGTH * FACTOR;

		Mesh.position.set(RegionX * Region.SIDE_LENGTH * FACTOR, RegionY * Region.SIDE_LENGTH * FACTOR, RegionZ * Region.SIDE_LENGTH * FACTOR);
		Mesh.scale.set(FACTOR, FACTOR, FACTOR);
		//Mesh.scale.set(0.125, 0.125, 0.125);
		this.Scene.add(Mesh);
		if(ReCall) this.PendingAddVirtualGeometryDataRequests--;
		Callback(Mesh);
		return Mesh;
	}

	AddLight(x, y, z, l = 1){
		let Light = new THREE.DirectionalLight(0xffffff, l);
		Light.position.set(x, y, z);
		this.Scene.add(Light);
	}
	AddBetterLight(X, Y, Z, Co, In, D){
		/*let Light = new THREE.PointLight(Co, In, D);
		Light.position.set(X, Y, Z);
		Light.castShadow = true;
		this.Scene.add(Light);*/

		let Light = new THREE.PointLight(0xffffff, 1, 0);
		Light.castShadow = true;
		Light.position.set(115, 115, -115);
		this.Scene.add(Light);
		//let CameraHelper = new THREE.CameraHelper(Light.shadow.camera);
		//this.Scene.add(CameraHelper);

		/*let CameraHelper = new THREE.CameraHelper(Light.shadow.camera);
		this.Scene.add(CameraHelper);

		Light.shadow.camera.left = 100;
		Light.shadow.camera.right = 100;

		setInterval(function(){
			console.log("Hey");
			Light.target.updateMatrixWorld();
			Light.shadow.camera.updateProjectionMatrix();
		}.bind(this), 1000);*/
	}
	Render(){
		window.requestAnimationFrame(function(){
			this.Render();
		}.bind(this));
		this.RenderTime = window.performance.now() - this.LastRender;
		this.LastRender = window.performance.now();

		this.Renderer.render(this.Scene, this.Camera);

		//this.Graph.AddItem(this.PendingAddGeometryDataRequests);
		this.DebugInfoOverlay.Graph.AddItem(this.RenderTime);

		this.GenerateMoreGeometryData(); //This doesn't have to be in the Render method, but it doesn't really matter...
		this.GenerateMoreVirtualGeometryData();
	}

	GenerateMoreGeometryData(){
		///NOTE: This method gets run automatically every frame.
		if(this.Game.World.UpdatedRegions === 0) return;
		let RegionArray = this.Game.World.Regions;

		for(let URegionX in RegionArray){
			URegionX |= 0;
			let RegionX = (URegionX << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
			for(let URegionY in RegionArray[URegionX]){
				URegionY |= 0;
				let RegionY = (URegionY << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
				for(let URegionZ in RegionArray[URegionX][URegionY]){
					URegionZ |= 0;
					let RegionZ = (URegionZ << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
					let RegionM00 = RegionArray[((RegionX - 1) >>> 0) % (1 << POWER_OFFSET)]?.[URegionY]?.[URegionZ];
					let RegionP00 = RegionArray[((RegionX + 1) >>> 0) % (1 << POWER_OFFSET)]?.[URegionY]?.[URegionZ];
					let Region0M0 = RegionArray[URegionX]?.[((RegionY - 1) >>> 0) % (1 << POWER_OFFSET)]?.[URegionZ];
					let Region0P0 = RegionArray[URegionX]?.[((RegionY + 1) >>> 0) % (1 << POWER_OFFSET)]?.[URegionZ];
					let Region00M = RegionArray[URegionX]?.[URegionY]?.[((RegionZ - 1) >>> 0) % (1 << POWER_OFFSET)];
					let Region00P = RegionArray[URegionX]?.[URegionY]?.[((RegionZ + 1) >>> 0) % (1 << POWER_OFFSET)];
					let Region000 = RegionArray[URegionX][URegionY][URegionZ];
					///I could've just created a new array but that would still be as efficient as using the original array.
					//This way, I've stored the pointers in single variables so that they can be accessed more easily by the engine.
					//if(window.performance.now() > 1000) debugger;
					if(!(
						RegionM00?.LoadState >= Region.LOAD_STATE_GENERATED_DATA &&
						RegionP00?.LoadState >= Region.LOAD_STATE_GENERATED_DATA &&
						Region0M0?.LoadState >= Region.LOAD_STATE_GENERATED_DATA &&
						Region0P0?.LoadState >= Region.LOAD_STATE_GENERATED_DATA &&
						Region00M?.LoadState >= Region.LOAD_STATE_GENERATED_DATA &&
						Region00P?.LoadState >= Region.LOAD_STATE_GENERATED_DATA &&
						Region000.LoadState < Region.LOAD_STATE_GENERATING_MESH
					)) continue;

					let RegionData = {
						[((RegionX - 1) >>> 0) % (1 << POWER_OFFSET)]:{
							[URegionY]:{
								[URegionZ]:{
									"Data": RegionM00?.Data,
									"CommonBlock": RegionM00?.CommonBlock
								}
							}
						},
						[((RegionX + 1) >>> 0) % (1 << POWER_OFFSET)]:{
							[URegionY]:{
								[URegionZ]:{
									"Data": RegionP00?.Data,
									"CommonBlock": RegionP00?.CommonBlock
								}
							}
						},
						[URegionX]:{
							[((RegionY - 1) >>> 0) % (1 << POWER_OFFSET)]:{
								[URegionZ]:{
									"Data": Region0M0?.Data,
									"CommonBlock": Region0M0?.CommonBlock
								}
							},
							[((RegionY + 1) >>> 0) % (1 << POWER_OFFSET)]:{
								[URegionZ]:{
									"Data": Region0P0?.Data,
									"CommonBlock": Region0P0?.CommonBlock
								}
							},
							[URegionY]:{
								[((RegionZ - 1) >>> 0) % (1 << POWER_OFFSET)]:{
									"Data": Region00M?.Data,
									"CommonBlock": Region00M?.CommonBlock
								},
								[((RegionZ + 1) >>> 0) % (1 << POWER_OFFSET)]:{
									"Data": Region00P?.Data,
									"CommonBlock": Region00P?.CommonBlock
								},
								[URegionZ]:{
									"Data": Region000?.Data,
									"CommonBlock": Region000?.CommonBlock
								}
							}
						}
					};

					this.WorkerGeometryDataGenerator.postMessage({
						"Request": "GenerateGeometryData",
						"URegionX": URegionX,
						"URegionY": URegionY,
						"URegionZ": URegionZ,
						"SideLength": Region.SIDE_LENGTH,
						"RegionData": RegionData
					});
					this.Game.World.Regions[URegionX][URegionY][URegionZ].LoadState = Region.LOAD_STATE_GENERATING_MESH;
				}
			}
		}
		this.Game.World.UpdatedRegions = 0;
	}
	GenerateMoreVirtualGeometryData(){
		//debugger;
		///NOTE: This method gets run automatically every frame.

		//This is almost a copy of the original GenerateMoreGeometryData method, but the neighbouring
		//regions have been excluded. This is because generating the edges of the region geometry
		//data takes the longest, and these meshes will never be seen up close. This might create
		//strange borders along the axes, but we'll see... A solution to this might be to stretch
		//out the regions a little bit to fill the blank space?

		for(let Depth = 0; Depth < VIRTUAL_REGION_DEPTHS; Depth++){
			if(this.Game.World.UpdatedVirtualRegions[Depth] === 0) continue;
			let RegionArray = this.Game.World.VirtualRegions[Depth];
			for(let URegionX in RegionArray){
				URegionX |= 0;
				const RegionX = (URegionX << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
				for(let URegionY in RegionArray[URegionX]){
					URegionY |= 0;
					const RegionY = (URegionY << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
					for(let URegionZ in RegionArray[URegionX][URegionY]){
						URegionZ |= 0;
						const RegionZ = (URegionZ << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
						const Region000 = RegionArray[URegionX][URegionY][URegionZ];

						if(Region000.LoadState < Region.LOAD_STATE_GENERATED_DATA || Region000.LoadState >= Region.LOAD_STATE_GENERATING_MESH || Region000.LoadState === undefined) continue;


						let RegionData = {
							"Region": Region000?.Data,
							"HeightMap": Region000?.HeightMap,
							"CommonBlock": Region000?.CommonBlock
						};

						this.WorkerGeometryDataGenerator.postMessage({
							"Request": "GenerateVirtualGeometryData",
							"Depth": Depth,
							"URegionX": URegionX,
							"URegionY": URegionY,
							"URegionZ": URegionZ,
							"SideLength": Region.SIDE_LENGTH,
							"RegionData": RegionData
						});
						this.Game.World.VirtualRegions[Depth][URegionX][URegionY][URegionZ].LoadState = Region.LOAD_STATE_GENERATING_MESH;
					}
				}
			}
			this.Game.World.UpdatedVirtualRegions[Depth] = 0;
		}

	}
}

class Game{
	constructor(Main){
		this.Main = Main;
		this.Keys = {};

		this.World = new World(this);
		this.Renderer = new Renderer(this);
		//this.PerformanceOverlay = new PerformanceOverlay;
		this.PointerLocked = false;

		this.InitPointerLock();
		this.InitEventListeners();

		this.UpdatePlayerPosition();
	}
	InitPointerLock(){
		this.Renderer.Renderer.domElement.requestPointerLock = this.Renderer.Renderer.domElement.requestPointerLock || this.Renderer.Renderer.domElement.mozRequestPointerLock;
		this.Renderer.Renderer.domElement.exitPointerLock = this.Renderer.Renderer.domElement.exitPointerLock || this.Renderer.Renderer.domElement.mozExitRequestPointerLock;
		this.Renderer.Renderer.domElement.addEventListener("click", function(){
			this.Renderer.Renderer.domElement.requestPointerLock();
		}.bind(this));

		document.addEventListener("mousemove", function(e){this.UpdateMousePosition(e);}.bind(this));

		let LockChangeAlert = function(){
			if(document.pointerLockElement === this.Renderer.Renderer.domElement || document.mozPointerLockElement === this.Renderer.Renderer.domElement){
				console.log("The pointer lock status is now locked.");
				this.PointerLocked = !0;
			} else{
				console.log("The pointer lock status is now unlocked.");
				this.PointerLocked = !1;
			}
		}.bind(this);

		document.addEventListener("pointerlockchange", function(){LockChangeAlert();}.bind(this), !1);
		document.addEventListener("mozpointerlockchange", function(){LockChangeAlert();}.bind(this), !1);


	}
	InitEventListeners(){
		document.addEventListener("keydown", function(Key){
			this.Keys[Key.code] = true;
		}.bind(this));
		document.addEventListener("keyup", function(Key){
			this.Keys[Key.code] = false;
		}.bind(this));
	}
	UpdateMousePosition(e){
		if(!this.PointerLocked) return;
		this.Renderer.Camera.rotation.y -= e.movementX / 500;
		this.Renderer.Camera.rotation.x += e.movementY / 500;
		if(this.Renderer.Camera.rotation.x > Math.PI / 2) this.Renderer.Camera.rotation.x = Math.PI / 2;
		if(this.Renderer.Camera.rotation.x < -Math.PI / 2) this.Renderer.Camera.rotation.x = -Math.PI / 2;
	}
	UpdatePlayerPosition(){
		window.requestAnimationFrame(function(){this.UpdatePlayerPosition();}.bind(this));
		this.Renderer.Camera.position.y += (!!this.Keys["Space"] - !!this.Keys["ShiftLeft"]) / .10;

		this.Renderer.Camera.position.x -= (!!this.Keys["KeyW"] - !!this.Keys["KeyS"]) * Math.sin(this.Renderer.Camera.rotation.y) / .10;
		this.Renderer.Camera.position.z -= (!!this.Keys["KeyW"] - !!this.Keys["KeyS"]) * Math.cos(this.Renderer.Camera.rotation.y) / .10;
		this.Renderer.Camera.position.x -= (!!this.Keys["KeyA"] - !!this.Keys["KeyD"]) * Math.cos(this.Renderer.Camera.rotation.y) / .10;
		this.Renderer.Camera.position.z += (!!this.Keys["KeyA"] - !!this.Keys["KeyD"]) * Math.sin(this.Renderer.Camera.rotation.y) / .10;
	}
}

class World{
	constructor(Game){
		this.Game = Game;

		this.WorkerRegionGenerator = new Worker(__ScriptPath__ + "/WorkerRegionGenerator.js");

		this.WorkerRegionGenerator.addEventListener("error", function(e) {
		    (DEBUG_LEVEL <= DEBUG_LEVELS.WARNING) && console.warn("Worker error:", e);
		});
		this.WorkerRegionGenerator.addEventListener("messageerror", function(e) {
		    (DEBUG_LEVEL <= DEBUG_LEVELS.WARNING) && console.warn("Message error:", e);
		});

		this.WorkerRegionGenerator.addEventListener("message", function(Event){
			if(Event.data.Request === "SaveRegionData"){
				let URegionX = Event.data.URegionX;
				let URegionY = Event.data.URegionY;
				let URegionZ = Event.data.URegionZ;
				if(!this.Regions[URegionX]?.[URegionY]?.[URegionZ]) return;
				this.Regions[URegionX][URegionY][URegionZ].Init(Event.data.RegionData, Event.data.HeightMap, Event.data.LoadState, Event.data.CommonBlock);
				(DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.debug("[" + (window.performance.now() >> 0) + "] Loading Region " + URegionX + ", " + URegionY + ", " + URegionZ);
				this.UpdatedRegions++;
			}
		}.bind(this));

		this.WorkerRegionGenerator.addEventListener("message", function(Event){
			if(Event.data.Request === "SaveVirtualRegionData"){
				const Depth = Event.data.Depth;
				const URegionX = Event.data.URegionX;
				const URegionY = Event.data.URegionY;
				const URegionZ = Event.data.URegionZ;
				if(!this.VirtualRegions[Depth]?.[URegionX]?.[URegionY]?.[URegionZ]) return;
				//debugger;
				this.VirtualRegions[Depth][URegionX][URegionY][URegionZ].Init(Event.data.RegionData, Event.data.HeightMap, Event.data.LoadState, Event.data.CommonBlock);
				(DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.debug("[" + (window.performance.now() >> 0) + "] Loading Virtual Region " + URegionX + ", " + URegionY + ", " + URegionZ + " at depth " + Depth);
				this.UpdatedVirtualRegions[Depth]++;
			}
		}.bind(this));

		this.Regions = {};

		this.VirtualRegions = [{}, {}, {}, {}, {}, {}, {}, {}];
		this.UpdatedVirtualRegions = [0, 0, 0, 0, 0];
		this.UpdatedRegions = 0; //This is used as an indicator to draw regions when another region is loaded.

		window.requestAnimationFrame(function(){
			this.GenerateMoreRegions();
			this.GenerateMoreVirtualRegions();
			this.UnloadRegions();
			this.UnloadVirtualRegions();
		}.bind(this));


	}

	UnloadRegions(){
		window.setTimeout(function(){this.UnloadRegions();}.bind(this), 1000);
		let PlayerX = Application.Main.Game.Renderer.Camera.position.x;
		let PlayerY = Application.Main.Game.Renderer.Camera.position.y;
		let PlayerZ = Application.Main.Game.Renderer.Camera.position.z;


		const MinRegionX = PlayerX / Region.SIDE_LENGTH - UNLOAD_DISTANCE;
		const MaxRegionX = MinRegionX + 2 * UNLOAD_DISTANCE;
		const MinRegionY = PlayerY / Region.SIDE_LENGTH - UNLOAD_DISTANCE;
		const MaxRegionY = MinRegionY + 2 * UNLOAD_DISTANCE;
		const MinRegionZ = PlayerZ / Region.SIDE_LENGTH - UNLOAD_DISTANCE;
		const MaxRegionZ = MinRegionZ + 2 * UNLOAD_DISTANCE;

		const RegionArray = Application.Main.Game.World.Regions;
		const Scene = Application.Main.Game.Renderer.Scene;
		//debugger;
		if(window.performance.now() < 10000) return;
		(DEBUG_LEVEL <= DEBUG_LEVELS.DEBUG) && console.time("Region unloader took");
		for(const URegionX in RegionArray){
			let RegionX = (URegionX << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
			let IsRegionXOutOfRange = RegionX > MinRegionX && RegionX < MaxRegionX;
			for(const URegionY in RegionArray[URegionX]){
				let RegionY = (URegionY << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
				let IsRegionYOutOfRange = RegionY > MinRegionY && RegionY < MaxRegionY;
				for(const URegionZ in RegionArray[URegionX][URegionY]){
					let RegionZ = (URegionZ << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
					if(RegionZ > MinRegionZ && RegionZ < MaxRegionZ && IsRegionXOutOfRange && IsRegionYOutOfRange) continue;


					RegionArray[URegionX][URegionY][URegionZ].Destruct();


					delete RegionArray[URegionX][URegionY][URegionZ];
					(DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.debug("Deleted mesh for Region " + URegionX + ", " + URegionY + ", " + URegionZ);

				}
				if(Object.keys(RegionArray[URegionX][URegionY]).length === 0) delete RegionArray[URegionX][URegionY];
			}
			if(Object.keys(RegionArray[URegionX]).length === 0) delete RegionArray[URegionX];
		}
		(DEBUG_LEVEL <= DEBUG_LEVELS.DEBUG) && console.timeEnd("Region unloader took");
		///This would benefit from being in another thread because it can cause some lag every 5 seconds.
	}

	UnloadVirtualRegions(Depth = VIRTUAL_REGION_DEPTHS - 1){
		if(Depth === VIRTUAL_REGION_DEPTHS - 1){
			window.requestAnimationFrame(function(){this.UnloadVirtualRegions();}.bind(this));
			if(window.performance.now() < 10000) return;
		}

		const PlayerX = Application.Main.Game.Renderer.Camera.position.x;
		const PlayerY = Application.Main.Game.Renderer.Camera.position.y;
		const PlayerZ = Application.Main.Game.Renderer.Camera.position.z;

		if(this.VirtualRegions[Depth] === undefined) this.VirtualRegions[Depth] = {};
		const SIDE_LENGTH = 1 << SIDE_LENGTH_POWER;
		const VRDepthObject = this.VirtualRegions[Depth];
		const Size = (2 ** VIRTUAL_REGION_DEPTHS) / (2 ** Depth);
		const Power = 2 ** Depth;
		const ReversePower = 2 ** (VIRTUAL_REGION_DEPTHS - Depth);
		const ThisX = Math.floor(PlayerX / (ReversePower * SIDE_LENGTH));
		const ThisY = Math.floor(PlayerY / (ReversePower * SIDE_LENGTH));
		const ThisZ = Math.floor(PlayerZ / (ReversePower * SIDE_LENGTH));
		const ThisMinRegionX = Math.floor((ThisX - VIRTUAL_UNLOAD_DISTANCE) / 2) * 2, ThisMaxRegionX = Math.ceil((ThisX + VIRTUAL_UNLOAD_DISTANCE) / 2) * 2;
		const ThisMinRegionY = Math.floor((ThisY - VIRTUAL_UNLOAD_DISTANCE) / 2) * 2, ThisMaxRegionY = Math.ceil((ThisY + VIRTUAL_UNLOAD_DISTANCE) / 2) * 2;
		const ThisMinRegionZ = Math.floor((ThisZ - VIRTUAL_UNLOAD_DISTANCE) / 2) * 2, ThisMaxRegionZ = Math.ceil((ThisZ + VIRTUAL_UNLOAD_DISTANCE) / 2) * 2;
		const CenterRegionX = (ThisMinRegionX + ThisMaxRegionX) / 2;
		const CenterRegionY = (ThisMinRegionY + ThisMaxRegionY) / 2;
		const CenterRegionZ = (ThisMinRegionZ + ThisMaxRegionZ) / 2;
		const VIRTUAL_LOAD_DISTANCE_HALVED = VIRTUAL_LOAD_DISTANCE / 2; //This should stay as VIRTUAL_LOAD_DISTANCE, not VIRTUAL_UNLOAD_DISTANCE.
		for(const URegionX in VRDepthObject){
			let RegionX = (URegionX << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
			let IsRegionXOutOfRange = RegionX > ThisMinRegionX && RegionX < ThisMaxRegionX;
			for(const URegionY in VRDepthObject[URegionX]){
				let RegionY = (URegionY << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
				let IsRegionYOutOfRange = RegionY > ThisMinRegionY && RegionY < ThisMaxRegionY;
				for(const URegionZ in VRDepthObject[URegionX][URegionY]){
					let RegionZ = (URegionZ << REVERSE_POWER_OFFSET) >> REVERSE_POWER_OFFSET;
					const VirtualRegion = VRDepthObject[URegionX][URegionY][URegionZ];
					//Note:
					/*
						This algorithm doesn't quite work. It leaves out too many regions that could've been deleted - this is because
						the LOD system's layer widths can vary from -1 to +1 of the original VIRTUAL_LOAD_DISTANCE.
						It just presumes the latter case of +1 in order to be safe, but over time, it could degrade the performance.
					*/

					if(RegionX < VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionX && RegionX >= -VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionX && RegionY < VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionY && RegionY >= -VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionY && RegionZ < VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionZ && RegionZ >= -VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionZ){
						//Inside of little inner cube.
						if(VirtualRegion.LoadState === Region.LOAD_STATE_TEMP_HIDDEN_MESH){
							if(VirtualRegion.TimeToLive --> 0) continue;
						} else if(VirtualRegion.LoadState === Region.LOAD_STATE_GENERATED_MESH){
							VirtualRegion.LoadState = Region.LOAD_STATE_TEMP_HIDDEN_MESH;
							VirtualRegion.TimeToLive = Region.DELETE_TEMP_HIDDEN_MESH_TTL_DEFAULT;
							setTimeout(function(){
								VirtualRegion.SetVisibility(false);
							}.bind(this), 5000); //To give the other regions of a higher depth to generate.
							continue;
						} else if(VirtualRegion.LoadState === Region.LOAD_STATE_HIDDEN_MESH) continue;
						//I am deleting regions that are still loading because in practice, it would be a rare scenario.
					}
					else if(VirtualRegion.LoadState === Region.LOAD_STATE_TEMP_HIDDEN_MESH){
						VirtualRegion.LoadState = Region.LOAD_STATE_GENERATED_MESH;
						VirtualRegion.SetVisibility(true);
					}

					if(RegionZ > ThisMinRegionZ && RegionZ < ThisMaxRegionZ && IsRegionXOutOfRange && IsRegionYOutOfRange) continue;
					VRDepthObject[URegionX][URegionY][URegionZ].Destruct();

					delete VRDepthObject[URegionX][URegionY][URegionZ];
					(DEBUG_LEVEL <= DEBUG_LEVELS.VERBOSE) && console.debug("Deleted mesh for Virtual Region " + URegionX + ", " + URegionY + ", " + URegionZ + " at depth " + Depth);
				}
				if(Object.keys(VRDepthObject[URegionX][URegionY]).length === 0) delete VRDepthObject[URegionX][URegionY];
			}
			if(Object.keys(VRDepthObject[URegionX]).length === 0) delete VRDepthObject[URegionX];
		}
		//Confusion intensifies... !!(Depth >> 1) === !!(Depth > 1) when Depth > 0.
		if(Depth >> 1) this.UnloadVirtualRegions(--Depth);
	}

	GenerateMoreRegions(){
		window.requestAnimationFrame(function(){this.GenerateMoreRegions();}.bind(this));
		const PlayerX = Application.Main.Game.Renderer.Camera.position.x;
		const PlayerY = Application.Main.Game.Renderer.Camera.position.y;
		const PlayerZ = Application.Main.Game.Renderer.Camera.position.z;


		/*const MinRegionX = PlayerX / Region.SIDE_LENGTH - LOAD_DISTANCE;
		const MaxRegionX = MinRegionX + 2 * LOAD_DISTANCE;
		const MinRegionY = PlayerY / Region.SIDE_LENGTH - LOAD_DISTANCE;
		const MaxRegionY = MinRegionY + 2 * LOAD_DISTANCE;
		const MinRegionZ = PlayerZ / Region.SIDE_LENGTH - LOAD_DISTANCE;
		const MaxRegionZ = MinRegionZ + 2 * LOAD_DISTANCE;*/

		//const MinRegionX = Math.round((PlayerX / Region.SIDE_LENGTH - LOAD_DISTANCE) / 2) * 2, MaxRegionX = Math.round((PlayerX / Region.SIDE_LENGTH + LOAD_DISTANCE) / 2) * 2;
		//const MinRegionY = Math.round((PlayerY / Region.SIDE_LENGTH - LOAD_DISTANCE) / 2) * 2, MaxRegionY = Math.round((PlayerY / Region.SIDE_LENGTH + LOAD_DISTANCE) / 2) * 2;
		//const MinRegionZ = Math.round((PlayerZ / Region.SIDE_LENGTH - LOAD_DISTANCE) / 2) * 2, MaxRegionZ = Math.round((PlayerZ / Region.SIDE_LENGTH + LOAD_DISTANCE) / 2) * 2;

		const MinRegionX = Math.floor(PlayerX / Region.SIDE_LENGTH - LOAD_DISTANCE), MaxRegionX = Math.floor(PlayerX / Region.SIDE_LENGTH + LOAD_DISTANCE);
		const MinRegionY = Math.floor(PlayerY / Region.SIDE_LENGTH - LOAD_DISTANCE), MaxRegionY = Math.floor(PlayerY / Region.SIDE_LENGTH + LOAD_DISTANCE);
		const MinRegionZ = Math.floor(PlayerZ / Region.SIDE_LENGTH - LOAD_DISTANCE), MaxRegionZ = Math.floor(PlayerZ / Region.SIDE_LENGTH + LOAD_DISTANCE);

		//let Min = -4;
		//let Max = 4;
		for(let RegionX = MinRegionX; RegionX < MaxRegionX; RegionX++){
			let URegionX = (RegionX >>> 0) % (1 << POWER_OFFSET);
			this.Regions[URegionX] = this.Regions[URegionX] || {};
			for(let RegionY = MinRegionY; RegionY < MaxRegionY; RegionY++){
				let URegionY = (RegionY >>> 0) % (1 << POWER_OFFSET);
				this.Regions[URegionX][URegionY] = this.Regions[URegionX][URegionY] || {};
				for(let RegionZ = MinRegionZ; RegionZ < MaxRegionZ; RegionZ++){
					let URegionZ = (RegionZ >>> 0) % (1 << POWER_OFFSET);
					if(this.Regions[URegionX][URegionY][URegionZ]?.LoadState >= Region.LOAD_STATE_GENERATING_DATA) continue;
					this.Regions[URegionX][URegionY][URegionZ] = new Region(URegionX, URegionY, URegionZ);
					this.Regions[URegionX][URegionY][URegionZ].LoadState = Region.LOAD_STATE_GENERATING_DATA;
					const DataArray = new Uint8Array(new SharedArrayBuffer(Region.SIDE_LENGTH ** 3));
					const HeightMap = new Int8Array(new SharedArrayBuffer(Region.SIDE_LENGTH ** 2));
					this.WorkerRegionGenerator.postMessage({
						"Request": "GenerateRegionData",
						"URegionX": URegionX,
						"URegionY": URegionY,
						"URegionZ": URegionZ,
						"SideLength": Region.SIDE_LENGTH,
						"DataArray": DataArray,
						"HeightMap": HeightMap
					});
				}
			}
		}
		//debugger;


	}
	GenerateMoreVirtualRegions(Depth = VIRTUAL_REGION_DEPTHS - 1){
		if(Depth === VIRTUAL_REGION_DEPTHS - 1) window.requestAnimationFrame(function(){this.GenerateMoreVirtualRegions();}.bind(this));
		const PlayerX = Application.Main.Game.Renderer.Camera.position.x;
		const PlayerY = Application.Main.Game.Renderer.Camera.position.y;
		const PlayerZ = Application.Main.Game.Renderer.Camera.position.z;
		if(this.VirtualRegions[Depth] === undefined) this.VirtualRegions[Depth] = {};
		const SIDE_LENGTH = 1 << SIDE_LENGTH_POWER;
		const VRDepthObject = this.VirtualRegions[Depth];
		const Size = (2 ** VIRTUAL_REGION_DEPTHS) / (2 ** Depth);
		let Test = 6;
		const Power = 2 ** Depth;
		if(Power === undefined) throw new Error("Wtf");
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
		for(let RegionX = ThisMinRegionX; RegionX < ThisMaxRegionX; RegionX++){
			const URegionX = (RegionX >>> 0) % (1 << POWER_OFFSET);
			VRDepthObject[URegionX] = VRDepthObject[URegionX] || {};
			for(let RegionY = ThisMinRegionY; RegionY < ThisMaxRegionY; RegionY++){
				const URegionY = (RegionY >>> 0) % (1 << POWER_OFFSET);
				VRDepthObject[URegionX][URegionY] = VRDepthObject[URegionX][URegionY] || {};
				for(let RegionZ = ThisMinRegionZ; RegionZ < ThisMaxRegionZ; RegionZ++){
					const URegionZ = (RegionZ >>> 0) % (1 << POWER_OFFSET);
					VRDepthObject[URegionX][URegionY][URegionZ] = VRDepthObject[URegionX][URegionY][URegionZ] || {};

					if(RegionX < VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionX && RegionX >= -VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionX && RegionY < VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionY && RegionY >= -VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionY && RegionZ < VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionZ && RegionZ >= -VIRTUAL_LOAD_DISTANCE_HALVED + CenterRegionZ) continue;

					if(VRDepthObject[URegionX][URegionY][URegionZ].LoadState >= Region.LOAD_STATE_GENERATING_DATA) continue;

					VRDepthObject[URegionX][URegionY][URegionZ] = new VirtualRegion(Depth, URegionX, URegionY, URegionZ);
					VRDepthObject[URegionX][URegionY][URegionZ].LoadState = Region.LOAD_STATE_GENERATING_DATA;
					//debugger;
					const DataArray = new Uint8Array(new SharedArrayBuffer(Region.SIDE_LENGTH ** 3));
					const HeightMap = new Int8Array(new SharedArrayBuffer(Region.SIDE_LENGTH ** 2));
					this.WorkerRegionGenerator.postMessage({
						"Request": "GenerateVirtualRegionData",
						"Depth": Depth,
						"URegionX": URegionX,
						"URegionY": URegionY,
						"URegionZ": URegionZ,
						"SideLength": Region.SIDE_LENGTH,
						"DataArray": DataArray,
						"HeightMap": HeightMap
					});
				}
			}
		}
		//Confusion intensifies... !!(Depth >> 1) === !!(Depth > 1) when Depth > 0.
		if(Depth >> 1) this.GenerateMoreVirtualRegions(--Depth);
	}

	GetVoxelRegion(X, Y, Z){
		const URegionX = ((X >> Region.SIDE_LENGTH_POWER) >>> 0) % (1 << POWER_OFFSET);
		const URegionY = ((Y >> Region.SIDE_LENGTH_POWER) >>> 0) % (1 << POWER_OFFSET);
		const URegionZ = ((Z >> Region.SIDE_LENGTH_POWER) >>> 0) % (1 << POWER_OFFSET);
		return this.Regions[URegionX]?.[URegionY]?.[URegionZ] || undefined;
	}
	GetRegion(RegionX, RegionY, RegionZ){
		const URegionX = (RegionX >>> 0) % (1 << POWER_OFFSET);
		const URegionY = (RegionY >>> 0) % (1 << POWER_OFFSET);
		const URegionZ = (RegionZ >>> 0) % (1 << POWER_OFFSET);
		return this.Regions[URegionX]?.[URegionY]?.[URegionZ];
	}

	GetRelativelyPositionedVoxelFromRegion(rX, rY, rZ, RegionX, RegionY, RegionZ){ ///This is a lot faster than calculating the modulo
		return this.GetRegion(RegionX, RegionY, RegionZ)?.Data[rX * Region.SIDE_LENGTH ** 2 + rY * Region.SIDE_LENGTH + rZ] || 0;
	}

	GetVoxel(X, Y, Z){
		let CurrentRegion = this.GetVoxelRegion(X, Y, Z);
		if(!CurrentRegion) return 0;
		let rX = X & Region.SIDE_LENGTH_MINUS_ONE;
		let rY = Y & Region.SIDE_LENGTH_MINUS_ONE;
		let rZ = Z & Region.SIDE_LENGTH_MINUS_ONE;
		return CurrentRegion.Data[rX * Region.SIDE_LENGTH_SQUARED + rY * Region.SIDE_LENGTH + rZ];
	}

	SetVoxel(X, Y, Z, Voxel){
		let CurrentRegion = this.GetVoxelRegion(X, Y, Z);
		if(!CurrentRegion){
			return; //Create new region.
		}
		let SIDE_LENGTH = Region.SIDE_LENGTH;
		let rX = THREE.MathUtils.euclideanModulo(X, Region.SIDE_LENGTH) | 0;
		let rY = THREE.MathUtils.euclideanModulo(Y, Region.SIDE_LENGTH) | 0;
		let rZ = THREE.MathUtils.euclideanModulo(Z, Region.SIDE_LENGTH) | 0;
		CurrentRegion.Data[rX * SIDE_LENGTH ** 2 + rY * SIDE_LENGTH + rZ] = Voxel;

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
	static LOAD_STATE_TEMP_HIDDEN_MESH = 28;
	static LOAD_STATE_HIDDEN_MESH = 29;
	static LOAD_STATE_GENERATED_MESH = 30;

	static DELETE_TEMP_HIDDEN_MESH_TTL_DEFAULT = 100;
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

	constructor(URegionX, URegionY, URegionZ){
		this.URegionX = URegionX;
		this.URegionY = URegionY;
		this.URegionZ = URegionZ;
		this.TimeToLive = Region.DELETE_TEMP_HIDDEN_MESH_COUNTDOWN_DEFAULT; //Will only count down if required.
	}

	Init(RegionData, HeightMap, LoadState, CommonBlock){
		if(!CommonBlock) this.Data = RegionData;
		else RegionData = undefined;
		this.HeightMap = HeightMap;
		this.CommonBlock = CommonBlock;
		this.LoadState = LoadState;
		this.TransparentMesh = undefined;
		this.OpaqueMesh = undefined;
		///LoadStates:
		///9 : The data for this region is being generated.
		///5 : The data for the region has been deleted because it was unloaded.
		///10: The data for the region has been loaded/generated.
		///[Deprecated] 11: The data for this region hasn't been generated because it would be underground.
		///12: The data for this region hasn't been generated because it is made out of air (is invisible).
		///18: The region had an update and new geometry data has to be generated. (potentially modifying the existing one?)
		///20: The geometry data is being generated in another thread.
		///30: The geometry data has been generated and the region can now be displayed.
		///
		///Remarks:
		///States 2x and 3x will be set by the Renderer class.
		///State 20 will only start when its 6 adjacent adjacent regions have been loaded (i.e. are in states 1x).
	}
	Destruct(){
		//if(this.LoadState === Region.LOAD_STATE_GENERATING_DATA) this.AbortRegionGeneration();
		//else if(this.LoadState === Region.LOAD_STATE_GENERATING_MESH || this.LoadState === Region.LOAD_STATE_GENERATING_MESH) this.AbortMeshGeneration();
		Region.RemoveMesh(this.TransparentMesh);
		Region.RemoveMesh(this.OpaqueMesh);
		delete this.Data;
	}
	AbortRegionGeneration(){
		Application.Main.Game.Renderer.WorkerRegionGenerator.postMessage({
			"Request": "Abort",
			"URegionX": this.URegionX,
			"URegionY": this.URegionY,
			"URegionZ": this.URegionZ
		});
	}
	AbortMeshGeneration(){
		Application.Main.Game.Renderer.WorkerGeometryDataGenerator.postMessage({
			"Request": "Abort",
			"URegionX": this.URegionX,
			"URegionY": this.URegionY,
			"URegionZ": this.URegionZ
		});
	}
	SetVisibility(Visibility){
		if(this.TransparentMesh) this.TransparentMesh.visible = Visibility;
		if(this.OpaqueMesh) this.OpaqueMesh.visible = Visibility;
		debugger;
	}
	static RemoveMesh(Mesh){
		if(Mesh === undefined) return;
		Mesh.geometry.dispose();
		Mesh.material.dispose();
		Application.Main.Game.Renderer.Scene.remove(Mesh);
		Mesh = undefined;
	}
}

class VirtualRegion extends Region{
	constructor(Depth, URegionX, URegionY, URegionZ){
		super(URegionX, URegionY, URegionZ);
		this.Depth = Depth;
	}
}

class GraphOverlay_HTML{
	constructor(GivenProperties = {}){
		let PropertiesTemplate = {
			"Position": {

			}
		};

		Object.defineProperties(PropertiesTemplate.Position, {
			"X":{ //REVISE THIS!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
				"get": function(){
					return this.__XPos__;
				},
				"set": function(Scope, Value){
					this.__XPos__ = Value;
					Scope.DOMElement.style.left = Value + "px";
				}.BindArgs(this)
			},
			"Y":{
				"get": function(){
					return this.__YPos__;
				},
				"set": function(Scope, Value){
					this.__YPos__ = Value;
					Scope.DOMElement.style.top = Value + "px";
				}.BindArgs(this)
			}
		});

		Object.defineProperties(PropertiesTemplate, {
			"MaxDataPoints":{
				"get": function(){
					return this.__MaxDataPoints__;
				},
				"set": function(Scope, Value){
					this.__MaxDataPoints__ |= 0;
					if(Value === this.__MaxDataPoints__) return true;
					else if(Value < 0) return false;
					else if(Value > this.__MaxDataPoints__){ //Add
						let Difference = Value - this.__MaxDataPoints__;
						Scope.Data.splice(0, 0, ...new Array(Difference));
						for(let i = 0; i < Difference; i++){
							Scope.ColumnDOMElements.splice(0, 0, document.createElement("div"));
							Scope.DOMElement.appendChild(Scope.ColumnDOMElements[0]);
							Scope.ColumnDOMElements[0].style.position = "absolute";
						}
					} else{ //Remove
						let Difference = this.__MaxDataPoints__ - Value;
						this.Data.splice(0, Difference);
						this.ColumnDOMElements.splice(0, Difference);
					}
					this.__MaxDataPoints__ = Value;
					Scope.Changed = true;
				}.BindArgs(this)
			},
			"ZIndex":{
				"get": function(){
					return this.__ZIndex__;
				},
				"set": function(Scope, Value){
					this.__ZIndex__ = Value;
					Scope.DOMElement.style.zIndex = Value;
				}.BindArgs(this)
			},
			"Colour":{
				"get": function(){
					return this.__Colour__;
				},
				"set": function(Scope, Value){
					this.__Colour__ = Value;
					for(let i = 0, Length = Scope.ColumnDOMElements.length; i < Length; i++){
						Scope.ColumnDOMElements[i].style.backgroundColor = Value;
					}
					Scope.Changed = true;
				}.BindArgs(this)
			},
			"ColumnWidth":{
				"get": function(){
					return this.__ColumnWidth__;
				},
				"set": function(Scope, Value){
					this.__ColumnWidth__ = Value;
					for(let i = 0, Length = Scope.ColumnDOMElements.length; i < Length; i++){
						Scope.ColumnDOMElements[i].style.width = Value + "px";
					}
					Scope.Changed = true;
				}.BindArgs(this)
			},
			"MaxHeight":{
				"get": function(Scope){
					if(Scope.DOMElement.clientHeight < this.__MaxHeight__) this.__MaxHeight__ = Scope.DOMElement.clientHeight;
					else if(this.__MaxHeight__ < 0) this.__MaxHeight__ = 0;
					return this.__MaxHeight__;
				}.BindArgs(this),
				"set": function(Scope, Value){
					if(Value < 0) Value = -Value; //Might backfire but whatever
					else if(Value > Scope.DOMElement.clientHeight) Value = Scope.DOMElement.clientHeight;
					let Difference = this.__MaxHeight__ - Value;
					let Factor = this.__MaxHeight__ / Value;
					this.__MaxHeight__ = Value;
					Scope.Changed = true;
				}.BindArgs(this)
			},
			"MaxWidth":{
				"get": function(Scope){
					if(Scope.DOMElement.clientWidth < this.__MaxWidth__) this.__MaxWidth__ = Scope.DOMElement.clientWidth;
					else if(this.__MaxWidth__ < 0) this.__MaxWidth__ = 0;
					return this.__MaxWidth__;
				}.BindArgs(this),
				"set": function(Scope, Value){
					if(Value < 0) Value /= -1;
					else if(Value > Scope.DOMElement.clientWidth) Value = Scope.DOMElement.clientWidth;
					this.__MaxWidth__ = Value;
					Scope.Changed = true;
				}.BindArgs(this)
			},
			"ParentElement":{
				"get": function(){
					return this.__ParentElement__;
				},
				"set": function(Scope, Value){
					this.__ParentElement__ = Value;
					//I won't bother checking whether this was set already, etc.
					Value.appendChild(Scope.DOMElement);
				}.BindArgs(this)
			}
		});


		let DefaultProperties = { //The default properties.
			"Position":{
				"X": 0,
				"Y": 0
			},
			"MaxDataPoints": 120,
			"ZIndex": 2500,
			"Colour": "#007fffaf",
			"ColumnWidth": 1,
			"MaxHeight": 1000, //These values will be adjusted automatically if the parent DOM element has smaller dimensions.
			"MaxWidth": 1000,
			"ParentElement": document.getElementsByTagName("body")[0] //This must be defined by the user!
		};

		this.DOMElement = document.createElement("div");
		this.DOMElement.style.pointerEvents = "none";
		this.DOMElement.style.width = "100%";
		this.DOMElement.style.height = "100%";
		this.ColumnDOMElements = [];
		this.Data = [];//[1, 2, 5, 4, 6, 4, 3, 2, 5, 4, 6, 4, 2, 1, 5];

		this.InitialiseHTML();

		this.Properties = Utilities.MergeObjects(GivenProperties, DefaultProperties, PropertiesTemplate);

		/*for(let i = 0; i < 120; i++){
			this.Data.AddItems(Math.random() * 100).shift();
		}*/


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
		if(!this.Changed) return;
		this.Changed = false;

		let Height = this.DOMElement.clientHeight;
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
			/*this.ColumnDOMElements[i].style.height = "50px";
			this.ColumnDOMElements[i].style.width = "10px";
			this.ColumnDOMElements[i].style.left = "20px";
			this.ColumnDOMElements[i].style.top = "100px";*/
			this.ColumnDOMElements[i].style.left = OffsetLeft + "px";
			this.ColumnDOMElements[i].style.height = FractionOfMax * Height + "px";
			this.ColumnDOMElements[i].style.top = (1 - FractionOfMax) * Height + "px";
		}
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
					debugger;
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
						debugger;
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

class DebugInfoOverlay{
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
				return "Running on Electron 11.0.3";
			},
			function(){
				return "";
			},
			function(){
				return Math.round(1000 / Application.Main.Game.Renderer.RenderTime) + " fps (" + Application.Main.Game.Renderer.PendingAddGeometryDataRequests + " PADRs)";
			},
			function(){
				const Camera = Application.Main.Game.Renderer.Camera;
				return "Position: " + Math.round(Camera.position.x * 1000) / 1000 + " X, " + Math.round(Camera.position.y * 1000) / 1000 + " Y, " + Math.round(Camera.position.z * 1000) / 1000 + " Z";
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
}

/*
if(!1){
	//Test cases
	let a = {};

	for(let x = 0; x < 1000; x++){
	    a[x] = a[x] || {};
	    for(let y = 0; y < 1000; y++){
	        a[x][y] = 4;
	    }
	}
	console.time("a");
	for(let x = 0; x < 1000; x++) for(let y = 0; y < 1000; y++){
	    let b = a[x]?.[y];
	}
	console.timeEnd("a");console.time("b");
	for(let x = -1000; x < 0; x++) for(let y = -1000; y < 0; y++){
	    let b = a?.[x]?.[y];
	}
	console.timeEnd("b");console.time("c");
	for(let x = 0; x < 1000; x++) for(let y = 0; y < 1000; y++){
	    let b = a[x][y];
	}
	console.timeEnd("c");console.time("d");
	for(let x = 0; x < 1000; x++) for(let y = 0; y < 1000; y++){
	    let b = 0;
	    if(a[x] && a[x][y]) b = a[x][y];
	}
	console.timeEnd("d");console.time("e");
	for(let x = 111000; x < 112000; x++) for(let y = 111000; y < 112000; y++){
	    let b = 0;
	    if(a[x >>> 0] && a[x >>> 0][y >>> 0]) b = a[x >>> 0][y >>> 0];
	}
	console.timeEnd("e");console.time("f");
	for(let x = -1000; x < 0; x++) for(let y = -1000; y < 0; y++){
	    let xx = (x >>> 0);
	    let yy = (y >>> 0);
	    let b = 0;
	    b = a[xx]?.[yy] || 0;
	}
	console.timeEnd("f");console.time("g");
	for(let x = -1000; x < 0; x++) for(let y = -1000; y < 0; y++){
	    let xx = (x >>> 0) % 1 << 30;
	    let yy = (y >>> 0) % 1 << 30;
	    let b = 0;
	    b = a[xx]?.[yy] || 0;
	}
	console.timeEnd("g");

}
*/
