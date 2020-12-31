const IsOnElectron = typeof process !== "undefined";
let __LibrariesPath__ = IsOnElectron ? "./Libraries" : "/Libraries";
let __ScriptPath__ = IsOnElectron ? "./75d16862-8356-4a06-80f5-96785314ab73" : "./";
function IncludeStyleSheet(Source){
	let Element = document.createElement("link");
	Element.setAttribute("rel", "stylesheet");
	Element.type = "text/css";
	Element.href = Source;
	document.getElementsByTagName("head")[0].appendChild(Element);
}
[
	__LibrariesPath__ + "/prism/prism.css",
	__ScriptPath__ + "/Default.css",
	__ScriptPath__ + "/IncludeEscape.css",
	__ScriptPath__ + "/DebugInfoOverlayWrapper.css"
].forEach(function(Source){IncludeStyleSheet(Source);});
function IncludeLibrary(Source){
	let Element = document.createElement("script");
	Element.async = false; //Important!
	Element.setAttribute("type","text/javascript");
	Element.setAttribute("src", Source);
	document.getElementsByTagName("head")[0].appendChild(Element);
}
[
	__ScriptPath__ + "/ConstDefs.js",
	__LibrariesPath__ + "/Prototypes/Prototypes.js",
	__LibrariesPath__ + "/Listenable/Listenable.js",
	__LibrariesPath__ + "/ClassAggregation/ClassAggregation.js",
	__LibrariesPath__ + "/PointerLock/PointerLock.js",
	__LibrariesPath__ + "/ApplicationFrame/ApplicationFrame.js",
	__LibrariesPath__ + "/Utilities/Utilities.js",
	__LibrariesPath__ + "/pixi/pixi.js",
	__LibrariesPath__ + "/PixiUnsafeEval/unsafe-eval.js",
	__LibrariesPath__ + "/PixiWrapper/PW.js",
	__LibrariesPath__ + "/prism/prism.js",
	__LibrariesPath__ + "/3/three.js",
	__LibrariesPath__ + "/CanvasDrawing/CanvasDrawing.js",
	__ScriptPath__ + "/Main.js" ///This is the main source file. It is loaded last so that all the dependencies before it have already been loaded.
].forEach(function(Source){IncludeLibrary(Source);});
