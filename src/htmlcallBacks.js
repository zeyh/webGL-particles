/* anything involving html events handling*/
var quatMatrix = new Matrix4();   
var qNew = new Quaternion(0, 0, 0, 1); // most-recent mouse drag's rotation
var qTot = new Quaternion(0, 0, 0, 1);	// 'current' orientation (made from qNew)

// * HTML events
var g_isDrag = false;		// mouse-drag: true when user holds down mouse button
var g_xMclik = 0.0;		// last mouse button-down position (in CVV coords)
var g_yMclik = 0.0;
var g_xMdragTot = 0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var g_yMdragTot = 0.0;

var g_EyeX = 0.20, g_EyeY = 0.25, g_EyeZ = 4.25; //eye position default
var g_LookX = 0.0, g_LookY = 0.0, g_LookZ = 0.0;
var g_LookUp = 0.0;
var g_speed = 1;

var g_schemeOpt = 0;
// control lighting scheme slider bar
function controlScheme(){
    var slider = document.getElementById("shadingScheme");
    var optionText = document.querySelectorAll(".options");
    let instructions = document.querySelectorAll(".dynamicInstruction");
    var totalOptions = Array.from(Array(optionText.length).keys());
    var underline = function(){
        var currSelectionValue = slider.value;
        g_schemeOpt = currSelectionValue; // ! update shading scheme
        // setControlPanel();
        initVBOs(shadingScheme[g_schemeOpt]); // ! update all VBO associated w/ the shading scheme
        var currStyle = optionText[currSelectionValue].style;
        var currInstructionStyle = instructions[currSelectionValue].style;
        currStyle.fontWeight = 700;
        currStyle.setProperty("--isVisible", "visable");
        currStyle.setProperty("--animationFcn", "scaleX(1)");
        currInstructionStyle.setProperty("--animationFcn1", "scaleX(1)");
        currInstructionStyle.setProperty("--isVisible1", "visable");
        var restOptions = totalOptions.filter(num => num != currSelectionValue);
        restOptions.forEach(element => {
            optionText[element].style.fontWeight = 400;
            optionText[element].style.setProperty("--isVisible", "hidden")
            optionText[element].style.setProperty("--animationFcn", "scaleX(0)")
            instructions[element].style.setProperty("--animationFcn1", "scaleX(0)");
            instructions[element].style.setProperty("--isVisible1", "hidden");
        });
    }
    underline();

    slider.oninput = function(){ //keep listening slider input change
        underline();
    }
}

var isBlinn = false;
function controlSwitch(){
    var currSwitch = document.getElementById("phongSwitch");
    var watchSwitch = function(){
        isBlinn = !isBlinn;
        document.getElementById('phongSwitchText').textContent = isBlinn ? "Phong" : "Blinn-Phong";
        g_schemeOpt = !isBlinn ? 1 : 4;
        initVBOs(shadingScheme[g_schemeOpt]);
    }
    currSwitch.oninput = function(){ //keep listening slider input change
        watchSwitch();
    }
}

var isBlinn2 = false;
function controlSwitch2(){
    var currSwitch = document.getElementById("gouraudSwitch");
    var watchSwitch2 = function(){
        isBlinn2 = !isBlinn2;
        document.getElementById('gouraudSwitchText').textContent = isBlinn2 ? "Phong" : "Blinn-Phong";
        g_schemeOpt = !isBlinn2 ? 2 : 5;
        console.log(g_schemeOpt)
        initVBOs(shadingScheme[g_schemeOpt]);
    }
    currSwitch.oninput = function(){ //keep listening slider input change
        watchSwitch2();
    }
}

var isHeadlight = false;
function controlSwitch3(){
    var currSwitch = document.getElementById("headlightSwitch");
    var watchSwitch3 = function(){
        isHeadlight = !isHeadlight;
        document.getElementById('headlightSwitchText').textContent = isHeadlight ? "off" : "on";
        initVBOs(shadingScheme[g_schemeOpt]); //refresh vbo rendering
        console.log(isHeadlight, "headlight");
        console.log(isplight, "world light");
    }
    currSwitch.oninput = function(){ //keep listening slider input change
        watchSwitch3();
    }
}

var isplight = true;
function controlSwitch4(){
    var currSwitch = document.getElementById("plightSwitch");
    var watchSwitch4 = function(){
        isplight = !isplight;
        document.getElementById('plightSwitchText').textContent = isplight ? "off" : "on";
        initVBOs(shadingScheme[g_schemeOpt]); //refresh vbo rendering
        console.log(isHeadlight, "headlight");
        console.log(isplight, "world light");
    }
    currSwitch.oninput = function(){ //keep listening slider input change
        watchSwitch4();
    }
}



var reflectVal = [0.4,1.0,1.0,0];
var slider = document.querySelectorAll(".minislider");
var sliderText = document.querySelectorAll(".miniSliderText");
function setSlider(index){
    if(index != 3){ //fix width
        reflectVal[index] = (Math.round(slider[index].value * 100) / 100).toFixed(2);;
    }else{
        reflectVal[index] = slider[index].value;
    }
    sliderText[index].textContent = reflectVal[index];
}

var colors = [];
var colorSlider = document.querySelectorAll(".colorPicker");
colorSlider.forEach(elem => {
    let tmp = hexToRgb(elem.value);
    colors.push([tmp.r/255, tmp.g/255, tmp.b/255]); //get the default
    tmp = null;
});
function setColorSlider(index){
    let c = hexToRgb(colorSlider[index].value);
    colors[index] = [c.r/255, c.g/255, c.b/255];
    initVBOs(shadingScheme[g_schemeOpt]); //refresh vbo rendering
}

//https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
      return r + r + g + g + b + b;
    });
  
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  


// ===================================for dat-gui setup
var params = { 
    left: -1.00,
    right: 1.00,
    top: -1.00,
    bottom: 1.00,
    near: 1.00,
    far: 100.00,
};
var params_fly = { 
    turning_angle: 0.00,
    up_down: 0.00,
    speed: 0.10,
};
var view = this;
var isFrustrum = false;
var isFly = false;
view.use_frustum = false;
view.fly = false;
var guileft, guiright, guitop, guibottom, guinear, guifar;
var guiArr_frustum, guiArr_fly;
var gui;
function setControlPanel() {
    if(g_schemeOpt == 0){
        gui = new dat.GUI();
        //frustrum controller
        var frustrumController = gui.add(view, 'use_frustum').listen();
        guileft = gui.add(params, 'left', -2.00, 0.00);
        guiright = gui.add(params, 'right', 0.00, 2.00);
        guitop = gui.add(params, 'top', -2.00, 0.00);
        guibottom = gui.add(params, 'bottom', 0.00, 2.00);
        guinear = gui.add(params, 'near', 0.10, 4.00);
        guifar = gui.add(params, 'far', 5, 150);
        guiArr_frustum = [guileft, guiright, guitop, guibottom, guinear, guifar];
        disableGui(guiArr_frustum); //by default
        frustrumController.onChange(function (value) {
            isFrustrum = value
            if (!isFrustrum) {
                disableGui(guiArr_frustum);
            }
            else {
                enableGui(guiArr_frustum);
            }
        });
    }
    else{
        if(gui){
            gui.close();
        }
    }
    
}
function disableGui(arr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i].domElement.style.pointerEvents = "none"
        arr[i].domElement.style.opacity = .5;
    }
}
function enableGui(arr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i].domElement.style.pointerEvents = "auto"
        arr[i].domElement.style.opacity = 1;
    }
}
// fly
function flyForward(){
    if(isFly){
        g_EyeZ -= 0.1 * params_fly.speed;
        g_LookZ -= 0.1 * params_fly.speed;
        //turning head right/left
        g_LookX += 0.05 * params_fly.turning_angle;
        //turning horizontally up/down
        g_EyeY += 0.05 * params_fly.up_down;
        g_LookY += 0.05 * params_fly.up_down;
    }
}

// ===================================for individual control button
function resizeCanvas(gl, arr, u_ProjMatrix, projMatrix, u_ViewMatrix, viewMatrix, u_ModelMatrix, modelMatrix) {
    canvas = document.getElementById('webgl');
    canvas.width = window.innerWidth * 1;
    canvas.height = window.innerHeight * 7 / 10;
    // console.log("(width, height):", window.innerWidth, window.innerHeight)
    //adding a overall drawing function here
    drawAll(gl, arr, u_ProjMatrix, projMatrix, u_ViewMatrix, viewMatrix, u_ModelMatrix, modelMatrix);
}

var hideGrid = false;
function gridDisplay(){
    if(hideGrid){
        //start
        hideGrid = false;
        document.querySelector('#showGrid').textContent = 'Show Plane';
    }else{
        hideGrid = true;
        document.querySelector('#showGrid').textContent = 'Show Grid';
    }
}
var hideSphere = false;
function sphereDisplay(){
    if(hideSphere){
        //start
        hideSphere = false;
        document.querySelector('#showSphere').textContent = 'Show Sphere';
    }else{
        hideSphere = true;
        document.querySelector('#showSphere').textContent = 'Hide Sphere';
    }
}

var isStop = false;
function stopMotion1(){
    if(isStop){
        //start
        isStop = false;

    }else{
        isStop = true;
    }
}

var g_jointAngle2 = 0;
function rotateMotion1(){
    g_jointAngle2 += 10 % 360;
}


function writeHtml() {
    document.getElementById('EyeAt').innerHTML =
        'Eye: (' + g_EyeX.toFixed(3) + ', ' + g_EyeY.toFixed(3) + ', ' + g_EyeZ.toFixed(3) + ")";
    document.getElementById('LookAt').innerHTML =
        'Look At: (' + g_LookX.toFixed(3) + ', ' + g_LookY.toFixed(3) + ', ' + g_LookZ.toFixed(3) + ")";
}

function initWindow() {
    window.addEventListener('resize', resizeCanvas, false);
}



// * ===================Keyboard event-handling Callbacks===========
// ref: https://keycode.info/ http://learnwebgl.brown37.net/07_cameras/camera_rotating_motion.html
function keyAD(ev) {
    if (ev.keyCode == 68) { // d
        g_EyeX += 0.1 * g_speed;
        g_LookX += 0.1 * g_speed;

    } else if (ev.keyCode == 65) { // a
        g_EyeX -= 0.1 * g_speed;
        g_LookX -= 0.1 * g_speed;

    } else { return; }
}

var g_fogDist = new Float32Array([55, 80]);
function keyWS(ev) {
    if (ev.keyCode == 83) { // w moving forward
        g_EyeZ += 0.1 * g_speed;
        g_LookZ += 0.1 * g_speed;
        if (g_fogDist[1] > g_fogDist[0]) g_fogDist[1] -= 1; // ! change fog visibility

    } else if (ev.keyCode == 87) { // s moving backward
        g_EyeZ -= 0.1 * g_speed;
        g_LookZ -= 0.1 * g_speed;
        g_fogDist[1]  += 1; // ! change fog visibility
    } else { return; }
}

function keyQE(ev) {
    if (ev.keyCode == 81) { // q
        g_EyeY += 0.1 * g_speed;
        g_LookY += 0.1 * g_speed;
    } else if (ev.keyCode == 69) { // e
        g_EyeY -= 0.1 * g_speed;
        g_LookY -= 0.1 * g_speed;

    } else { return; }
}

function keyArrowRotateRight(ev) {
    if (ev.keyCode == 39) { // ->
        g_LookX += 0.09 * g_speed; //unstable rate of rotation
    } else if (ev.keyCode == 37) { // <-
        g_LookX -= 0.09 * g_speed;
    } else { return; }
}

function keyArrowRotateUp(ev) {//change x from -1 to 1
    if (ev.keyCode == 38) { // up ^
        g_LookY += 0.07 * g_speed;
    } else if (ev.keyCode == 40) { // down v
        g_LookY -= 0.07 * g_speed;
    } else { return; }
}

var g_matlSel = 18;
function materialKeyPress(ev) {
        switch(ev.keyCode)
        {
            case 77:	// UPPER-case 'M' key:
            case 109:	// LOWER-case 'm' key:
                g_matlSel = (g_matlSel +1)%MATL_DEFAULT;	
                console.log(g_matlSel)// see materials_Ayerdi.js for list
                break;
            // case 83: // UPPER-case 's' key:
            //     matl0.K_shiny += 1.0;								// INCREASE shinyness, but with a
            //     if(matl0.K_shiny > 128.0) matl0.K_shiny = 128.0;	// upper limit.
            //     console.log('UPPERcase S: ++K_shiny ==', matl0.K_shiny,'\n');	
            //     break;
            // case 115:	// LOWER-case 's' key:
            //     matl0.K_shiny += -1.0;								// DECREASE shinyness, but with a
            //     if(matl0.K_shiny < 1.0) matl0.K_shiny = 1.0;		// lower limit.
            //     console.log('lowercase s: --K_shiny ==', matl0.K_shiny, '\n');
            //     break;
            default:
            break;
        }
}
    

// * ===================Keyboard event-handling Callbacks===========
function clearDrag() {
    // Called when user presses 'Clear' button in our webpage
    g_xMdragTot = 0.0;
    g_yMdragTot = 0.0;
    g_lamp0PosY = 0.0;
    g_lamp0PosZ = 0.0;
}

function mouseWheel(en) {
    if (en.deltaY < 0) {
        g_viewScale -= 0.05;
    }
    else if (en.deltaY > 0) {
        g_viewScale += 0.05;
    }
}

var prevY, prevZ;
function myMouseDown(ev) {
    var rect = ev.target.getBoundingClientRect();
    var xp = ev.clientX - rect.left;
    var yp = canvas.height - (ev.clientY - rect.top);

    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width / 2) / (canvas.width / 2);
    var y = (yp - canvas.height / 2) / (canvas.height / 2);

    if( xp <= 500 && yp <= 600){ //dragging must be in correct place
        g_isDrag = true;
        // console.log("dragging",xp,yp )
    }
    // console.log("not",xp,yp )
    // g_isDrag = true;
    g_xMclik = x; 
    g_yMclik = y; 
    // console.log(yp); //(0-50)


};

var g_lamp0PosY, g_lamp0PosZ;
var g_eyePosY, g_eyePosZ;
var currLampPos;
function myMouseMove(ev) {
    if (g_isDrag == false) return;

    var rect = ev.target.getBoundingClientRect();
    var xp = ev.clientX - rect.left;
    var yp = canvas.height - (ev.clientY - rect.top);

    var x = (xp - canvas.width / 2) / (canvas.width / 2);
    var y = (yp - canvas.height / 2) / (canvas.height / 2);

    // g_lamp0.I_pos.elements.set([	 //TODO: somehow unable to change directly
    //     g_lamp0.I_pos.elements[0],
    //     g_lamp0.I_pos.elements[1] + 4.0*(x-g_xMclik),	// Horiz drag: change world Y
    //     g_lamp0.I_pos.elements[2] + 4.0*(y-g_yMclik) 	// Vert. drag: change world Z
    // ]);
    if(currLampPos){
        currLampPos[1] = currLampPos[1] + 4.0*(x-g_xMclik);
        currLampPos[2] = currLampPos[2] + 4.0*(y-g_yMclik);
    }

    // console.log(currLampPos)
    g_lamp0PosY = 4.0*(x-g_xMclik);
    g_lamp0PosZ = 4.0*(y-g_yMclik);
    g_eyePosY = 8.0*(x-g_xMclik);
    g_eyePosZ = 8.0*(y-g_yMclik);


    // find how far we dragged the mouse:
    g_xMdragTot += (x - g_xMclik);
    g_yMdragTot += (y - g_yMclik);
    
    g_xMclik = x;
    g_yMclik = y;
};

function myMouseUp(ev) {
    var rect = ev.target.getBoundingClientRect();
    var xp = ev.clientX - rect.left;
    var yp = canvas.height - (ev.clientY - rect.top);


    var x = (xp - canvas.width / 2) / (canvas.width / 2);
    var y = (yp - canvas.height / 2) / (canvas.height / 2);

    g_isDrag = false;
    g_xMdragTot += (x - g_xMclik);
    g_yMdragTot += (y - g_yMclik);
    // console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
    // dragQuat(x - g_xMclik, y - g_yMclik);
    // console.log("yclick: ", g_yMclik)

};

function dragQuat(xdrag, ydrag) {
    //from controlQuaterion.js
    var res = 5;
    var qTmp = new Quaternion(0, 0, 0, 1);
    var dist = Math.sqrt(xdrag * xdrag + ydrag * ydrag);
    qNew.setFromAxisAngle(-ydrag + 0.0001, xdrag + 0.0001, 0.0, dist * 150.0); // (why add tiny 0.0001? To ensure we never have a zero-length rotation axis)
    qTmp.multiply(qNew, qTot);			// apply new rotation to current rotation. 
    qTot.copy(qTmp);
};
