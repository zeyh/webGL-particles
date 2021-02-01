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

var g_EyeX = 0.00, g_EyeY = 0.0, g_EyeZ = 4.25; //eye position default
var g_LookX = 0.0, g_LookY = 0.0, g_LookZ = 0.0;
var g_LookUp = 0.0;
var g_speed = 1;

var g_schemeOpt = 0;
//TODO: 👇 encode the object's attribute
var g_curRunMode = 3;	// particle system state: 0=reset; 1= pause; 2=step; 3=run
var g_solverScheme = 1;

var g_dx; //record mouse changes
var g_dy;
var g_prevDx;
var g_prevDy;
var solverStr = ["Euler", "MidPoint", "2-Step Adams Bash", "Runge Kutta (time??)", "Default Solver", "Backward Euler(na)", "Backward MidPoint(na)", "Backward Adams Bash(na)", "Verlet(buggy...)", "Velocity Verlet(na)", "Leapfrog(na)"];

function setSolver(){
    document.querySelector('#selectedSolver').innerHTML = solverStr[g_currSolverType];
    for(let i=0; i<solverStr.length; i++){
        document.getElementById('myDropdown').innerHTML += 
        '<a class="solverType" onclick="changeSolver('+i+')">'+solverStr[i]+'</a>';
    }
}
function changeSolver(currSolverIdx){
    g_currSolverType = currSolverIdx;
    document.querySelector('#selectedSolver').innerHTML = solverStr[g_currSolverType];
    for (let index = 0; index < g_particleNum; index++) {
        g_particleArray[index].solvType = g_currSolverType;
    }
}
// drop down menu https://www.w3schools.com/howto/howto_js_dropdown.asp
function showSolverOptions() {
    document.getElementById("myDropdown").classList.toggle("show");
}
// Close the dropdown if the user clicks outside of it
window.onclick = function (event) {
    if (!event.target.matches('.dropbtn')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

// control lighting scheme slider bar
function controlScheme() {
    var slider = document.getElementById("shadingScheme");
    var optionText = document.querySelectorAll(".options");
    let instructions = document.querySelectorAll(".dynamicInstruction");
    var totalOptions = Array.from(Array(optionText.length).keys());
    var underline = function () {
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

    slider.oninput = function () { //keep listening slider input change
        underline();
    }
}

var isBlinn = false;
function controlSwitch() {
    var currSwitch = document.getElementById("phongSwitch");
    var watchSwitch = function () {
        isBlinn = !isBlinn;
        document.getElementById('phongSwitchText').textContent = isBlinn ? "Phong" : "Blinn-Phong";
        g_schemeOpt = !isBlinn ? 1 : 4;
        initVBOs(shadingScheme[g_schemeOpt]);
    }
    currSwitch.oninput = function () { //keep listening slider input change
        watchSwitch();
    }
}

var isBlinn2 = false;
function controlSwitch2() {
    var currSwitch = document.getElementById("gouraudSwitch");
    var watchSwitch2 = function () {
        isBlinn2 = !isBlinn2;
        document.getElementById('gouraudSwitchText').textContent = isBlinn2 ? "Phong" : "Blinn-Phong";
        g_schemeOpt = !isBlinn2 ? 2 : 5;
        console.log(g_schemeOpt)
        initVBOs(shadingScheme[g_schemeOpt]);
    }
    currSwitch.oninput = function () { //keep listening slider input change
        watchSwitch2();
    }
}

var isHeadlight = false;
function controlSwitch3() {
    var currSwitch = document.getElementById("headlightSwitch");
    var watchSwitch3 = function () {
        isHeadlight = !isHeadlight;
        document.getElementById('headlightSwitchText').textContent = isHeadlight ? "off" : "on";
        initVBOs(shadingScheme[g_schemeOpt]); //refresh vbo rendering
        console.log(isHeadlight, "headlight");
        console.log(isplight, "world light");
    }
    currSwitch.oninput = function () { //keep listening slider input change
        watchSwitch3();
    }
}

var isplight = true;
function controlSwitch4() {
    var currSwitch = document.getElementById("plightSwitch");
    var watchSwitch4 = function () {
        isplight = !isplight;
        document.getElementById('plightSwitchText').textContent = isplight ? "off" : "on";
        initVBOs(shadingScheme[g_schemeOpt]); //refresh vbo rendering
        console.log(isHeadlight, "headlight");
        console.log(isplight, "world light");
    }
    currSwitch.oninput = function () { //keep listening slider input change
        watchSwitch4();
    }
}

var reflectVal = [0.4, 1.0, 1.0, 0];
var slider = document.querySelectorAll(".minislider");
var sliderText = document.querySelectorAll(".miniSliderText");
function setSlider(index) {
    if (index != 3) { //fix width
        reflectVal[index] = (Math.round(slider[index].value * 100) / 100).toFixed(2);;
    } else {
        reflectVal[index] = slider[index].value;
    }
    sliderText[index].textContent = reflectVal[index];
}

var colors = [];
var colorSlider = document.querySelectorAll(".colorPicker");
colorSlider.forEach(elem => {
    let tmp = hexToRgb(elem.value);
    colors.push([tmp.r / 255, tmp.g / 255, tmp.b / 255]); //get the default
    tmp = null;
});
function setColorSlider(index) {
    let c = hexToRgb(colorSlider[index].value);
    colors[index] = [c.r / 255, c.g / 255, c.b / 255];
    initVBOs(shadingScheme[g_schemeOpt]); //refresh vbo rendering
}

function hexToRgb(hex) { //https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}


// ! ===================================for dat-gui setup
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
    if (g_schemeOpt == 0) {
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
    else {
        if (gui) {
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
function flyForward() {
    if (isFly) {
        g_EyeZ -= 0.1 * params_fly.speed;
        g_LookZ -= 0.1 * params_fly.speed;
        //turning head right/left
        g_LookX += 0.05 * params_fly.turning_angle;
        //turning horizontally up/down
        g_EyeY += 0.05 * params_fly.up_down;
        g_LookY += 0.05 * params_fly.up_down;
    }
}

// ! ===================================for individual control button
function resizeCanvas(gl, arr, u_ProjMatrix, projMatrix, u_ViewMatrix, viewMatrix, u_ModelMatrix, modelMatrix) {
    canvas = document.getElementById('webgl');
    canvas.width = window.innerWidth * 1;
    canvas.height = window.innerHeight * 7 / 10;
    // console.log("(width, height):", window.innerWidth, window.innerHeight)
    //adding a overall drawing function here
    drawAll(gl, arr, u_ProjMatrix, projMatrix, u_ViewMatrix, viewMatrix, u_ModelMatrix, modelMatrix);
}

var hideGrid = false;
function gridDisplay() {
    if (hideGrid) {
        //start
        hideGrid = false;
        document.querySelector('#showGrid').textContent = 'Show Plane';
    } else {
        hideGrid = true;
        document.querySelector('#showGrid').textContent = 'Show Grid';
    }
}
var hideSphere = false;
function sphereDisplay() {
    if (hideSphere) {
        //start
        hideSphere = false;
        document.querySelector('#showSphere').textContent = 'Show Sphere';
    } else {
        hideSphere = true;
        document.querySelector('#showSphere').textContent = 'Hide Sphere';
    }
}

var isTopView = false;
function changeView() {
    g_prevDx = 0;
    g_prevDy = 0;
    g_dx = 0
    g_dy = 0;

    if (!isTopView) {
        isTopView = true;
        document.querySelector('#topView').textContent = 'Front View';
        g_EyeX = 0.0, g_EyeY = 4.25, g_EyeZ = 4.25;
        g_LookX = 0.0, g_LookY = 3.3, g_LookZ = 3.5;
    }
    else {
        isTopView = false;
        document.querySelector('#topView').textContent = 'Top View';
        g_EyeX = 0.0, g_EyeY = 0.0, g_EyeZ = 4.25;
        g_LookX = 0.0, g_LookY = 0.0, g_LookZ = 0.0;
    }
}



var isStop = false;
function stopMotion1() {
    if (isStop) {
        //start
        isStop = false;

    } else {
        isStop = true;
    }
}

var g_jointAngle2 = 0;
function rotateMotion1() {
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



// ! ===================Keyboard event-handling Callbacks===========
// ref: https://keycode.info/ http://learnwebgl.brown37.net/07_cameras/camera_rotating_motion.html


function key123(ev) {
    if (ev.keyCode == 48) { // 0 reset
        for (let index = 0; index < g_particleNum; index++) {
            g_particleArray[index].runMode = 0;
        }
    }
    else if (ev.keyCode == 49) { // 1 pause
        for (let index = 0; index < g_particleNum; index++) {
            g_particleArray[index].runMode = 1;
        }
    }
    else if (ev.keyCode == 50) { // 2 step
        for (let index = 0; index < g_particleNum; index++) {
            g_particleArray[index].runMode = 2;
        }
    }
    else if (ev.keyCode == 51) { // 3 run
        for (let index = 0; index < g_particleNum; index++) {
            g_particleArray[index].runMode = 3;
        }
    }
    else if (ev.keyCode == 82) { //R for adding velocity
        if (ev.shiftKey == false) {   // 'r' key: SOFT reset; boost velocity only
            console.log("r being pressed");
            if(this.g_currSolverType == SOLV_MIDPOINT 
                || this.g_currSolverType == SOLV_EULER
                || this.g_currSolverType == SOLV_ADAMS_BASH
                || this.g_currSolverType == SOLV_RUNGEKUTTA
            ){
                for (let index = 0; index < g_particleNum; index++) {
                    g_particleArray[index].runMode = 3;  // RUN!
                    var j = 0; // array index for particle i
                    for (var i = 0; i < g_particleArray[index].partCount; i += 1, j += PART_MAXVAR) {
                        g_particleArray[index].roundRand();
                        if (g_particleArray[index].s1[j + PART_XVEL] > 0.0) {
                            g_particleArray[index].s1[j + PART_XVEL] += 0.5 + 0.4 * g_particleArray[index].randX * g_particleArray[index].INIT_VEL;
                        }
                        else {
                            g_particleArray[index].s1[j + PART_XVEL] -= 0.5 + 0.4 * g_particleArray[index].randX * g_particleArray[index].INIT_VEL;
                        }

                        if (g_particleArray[index].s1[j + PART_YVEL] > 0.0) {
                            g_particleArray[index].s1[j + PART_YVEL] += 1.7 + 0.4 * g_particleArray[index].randY * g_particleArray[index].INIT_VEL;
                        }
                        else {
                            g_particleArray[index].s1[j + PART_YVEL] -= 1.7 + 0.4 * g_particleArray[index].randY * g_particleArray[index].INIT_VEL;
                        }

                        if (g_particleArray[index].s1[j + PART_ZVEL] > 0.0) {
                            g_particleArray[index].s1[j + PART_ZVEL] += 0.5 + 0.4 * g_particleArray[index].randZ * g_particleArray[index].INIT_VEL;
                        }
                        else {
                            g_particleArray[index].s1[j + PART_ZVEL] -= 0.5 + 0.4 * g_particleArray[index].randZ * g_particleArray[index].INIT_VEL;
                        }
                    }
                }
            }
            else{
                for (let index = 0; index < g_particleNum; index++) {
                    g_particleArray[index].runMode = 3;  // RUN!
                    var j = 0; // array index for particle i
                    for (var i = 0; i < g_particleArray[index].partCount; i += 1, j += PART_MAXVAR) {
                        g_particleArray[index].roundRand();
                        if (g_particleArray[index].s2[j + PART_XVEL] > 0.0) {
                            g_particleArray[index].s2[j + PART_XVEL] += 0.5 + 0.4 * g_particleArray[index].randX * g_particleArray[index].INIT_VEL;
                        }
                        else {
                            g_particleArray[index].s2[j + PART_XVEL] -= 0.5 + 0.4 * g_particleArray[index].randX * g_particleArray[index].INIT_VEL;
                        }

                        if (g_particleArray[index].s2[j + PART_YVEL] > 0.0) {
                            g_particleArray[index].s2[j + PART_YVEL] += 1.7 + 0.4 * g_particleArray[index].randY * g_particleArray[index].INIT_VEL;
                        }
                        else {
                            g_particleArray[index].s2[j + PART_YVEL] -= 1.7 + 0.4 * g_particleArray[index].randY * g_particleArray[index].INIT_VEL;
                        }

                        if (g_particleArray[index].s2[j + PART_ZVEL] > 0.0) {
                            g_particleArray[index].s2[j + PART_ZVEL] += 0.5 + 0.4 * g_particleArray[index].randZ * g_particleArray[index].INIT_VEL;
                        }
                        else {
                            g_particleArray[index].s2[j + PART_ZVEL] -= 0.5 + 0.4 * g_particleArray[index].randZ * g_particleArray[index].INIT_VEL;
                        }
                    }
                }
            }
        }
        else {      // HARD reset: position AND velocity, BOTH state vectors:
            console.log("shift+r being pressed");
            for (let index = 0; index < g_particleNum; index++) {
                g_particleArray[index].runMode = 0;
                var j = 0;
                for (var i = 0; i < g_particleArray[index].partCount; i += 1, j += PART_MAXVAR) {
                    g_particleArray[index].roundRand();
                    g_particleArray[index].s1[j + PART_XPOS] = -0.9 + g_particleArray[index].randX;      // lower-left corner of CVV
                    g_particleArray[index].s1[j + PART_YPOS] = -0.9 + g_particleArray[index].randY;      // with a 0.1 margin
                    g_particleArray[index].s1[j + PART_ZPOS] = -0.9 + g_particleArray[index].randZ;
                    g_particleArray[index].s1[j + PART_XVEL] = 3.7 + 0.4 * g_particleArray[index].randX * g_particleArray[index].INIT_VEL;
                    g_particleArray[index].s1[j + PART_YVEL] = 3.7 + 0.4 * g_particleArray[index].randY * g_particleArray[index].INIT_VEL;
                    g_particleArray[index].s1[j + PART_ZVEL] = 3.7 + 0.4 * g_particleArray[index].randZ * g_particleArray[index].INIT_VEL;
                    g_particleArray[index].s2.set(g_particleArray[index].s1);
                }
            }

        }

    }
    else if (ev.keyCode == 70) { //F for change solver 
        for (let index = 0; index < g_particleNum; index++) {
            if (g_particleArray[index].solvType == 0) {
                console.log("change to implicit solver");
                g_particleArray[index].solvType = 1;
            }
            else {
                console.log("change to explicit solver");
                g_particleArray[index].solvType = 0;
            }
        }
    }
}

function cameraDistance() {
    /* calculate the euclidean distance with lookAt and eye*/
    x = g_LookX - g_EyeX;
    y = g_LookY - g_EyeY;
    z = g_LookZ - g_EyeZ;
    return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2));
}

function keyAD(ev) {
    let dist = cameraDistance();
    let vec1 = [0, 1, 0];
    let vec2 = [(g_LookX - g_EyeX) / dist, (g_LookY - g_EyeY) / dist, (g_LookZ - g_EyeZ) / dist];
    let perpVec = math.cross(vec1, vec2); //perpendicular to forward direction
    if (ev.keyCode == 65) { // a left
        g_EyeX += 0.1 * g_speed * perpVec[0];
        g_EyeY += 0.1 * g_speed * perpVec[1];
        g_EyeZ += 0.1 * g_speed * perpVec[2];
        g_LookX += 0.1 * g_speed * perpVec[0];
        g_LookY += 0.1 * g_speed * perpVec[1];
        g_LookZ += 0.1 * g_speed * perpVec[2];
    } else if (ev.keyCode == 68) { // d right
        g_EyeX -= 0.1 * g_speed * perpVec[0];
        g_EyeY -= 0.1 * g_speed * perpVec[1];
        g_EyeZ -= 0.1 * g_speed * perpVec[2];
        g_LookX -= 0.1 * g_speed * perpVec[0];
        g_LookY -= 0.1 * g_speed * perpVec[1];
        g_LookZ -= 0.1 * g_speed * perpVec[2];
    } else { return; }
}

var g_fogDist = new Float32Array([55, 80]);
function keyWS(ev) {
    let dist = cameraDistance();
    if (ev.keyCode == 87) { // s moving backward 
        g_EyeX += 0.1 * g_speed * (g_LookX - g_EyeX) / dist;  //sin theta
        g_EyeY += 0.1 * g_speed * (g_LookY - g_EyeY) / dist;
        g_EyeZ += 0.1 * g_speed * (g_LookZ - g_EyeZ) / dist;
        g_LookX += 0.1 * g_speed * (g_LookX - g_EyeX) / dist;
        g_LookY += 0.1 * g_speed * (g_LookY - g_EyeY) / dist;
        g_LookZ += 0.1 * g_speed * (g_LookZ - g_EyeZ) / dist;
        if (g_fogDist[1] > g_fogDist[0]) g_fogDist[1] -= 1; // ! change fog visibility

    } else if (ev.keyCode == 83) { //  w moving forward
        g_EyeX -= 0.1 * g_speed * (g_LookX - g_EyeX) / dist;
        g_EyeY -= 0.1 * g_speed * (g_LookY - g_EyeY) / dist;
        g_EyeZ -= 0.1 * g_speed * (g_LookZ - g_EyeZ) / dist;
        g_LookX -= 0.1 * g_speed * (g_LookX - g_EyeX) / dist;
        g_LookY -= 0.1 * g_speed * (g_LookY - g_EyeY) / dist;
        g_LookZ -= 0.1 * g_speed * (g_LookZ - g_EyeZ) / dist;
        g_fogDist[1] += 1; // ! change fog visibility
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

var theta1 = Math.PI;
function keyArrowRotateRight(ev) {
    if (ev.keyCode == 39) { // ->
        theta1 -= 0.05;
        console.log(Math.sin(theta1), Math.cos(theta1))
        g_LookX = g_EyeX + 0.7 * g_speed * Math.sin(theta1);
        g_LookZ = g_EyeZ + 0.7 * g_speed * Math.cos(theta1);
    } else if (ev.keyCode == 37) { // <-
        theta1 += 0.05;
        g_LookX = g_EyeX + 0.7 * g_speed * Math.sin(theta1);
        g_LookZ = g_EyeZ + 0.7 * g_speed * Math.cos(theta1);
    } else { return; }
}

var theta2 = 0;
function keyArrowRotateUp(ev) {//change x from -1 to 1
    if (ev.keyCode == 38) { // up ^
        theta2 += 0.05;
        g_LookY = g_EyeY + 0.5 * g_speed * Math.sin(theta2);
    } else if (ev.keyCode == 40) { // down v
        theta2 -= 0.05;
        g_LookY = g_EyeY + 0.5 * g_speed * Math.sin(theta2);
    } else { return; }
}

var g_matlSel = 18;
function materialKeyPress(ev) {
    switch (ev.keyCode) {
        case 77:	// UPPER-case 'M' key:
        case 109:	// LOWER-case 'm' key:
            g_matlSel = (g_matlSel + 1) % MATL_DEFAULT;
            console.log(g_matlSel)// see materials_Ayerdi.js for list
            break;
        default:
            break;
    }
}

// for listening a key is being pressed/released: https://stackoverflow.com/questions/16345870/keydown-keyup-events-for-specific-keys
var g_isCameraFixed = true;
const cameraAction = {
    fixCamera() {
        g_isCameraFixed = true;
        g_mousePosX = g_mousePosX_curr;
        g_mousePosY = g_mousePosY_curr;
    },
    changeCamera() {
        g_isCameraFixed = false;
    },
}
const keyAction = {
    Alt: { keydown: cameraAction.changeCamera, keyup: cameraAction.fixCamera },
    Meta: { keydown: cameraAction.changeCamera, keyup: cameraAction.fixCamera },
    Shift: { keydown: cameraAction.changeCamera, keyup: cameraAction.fixCamera },
}
const keyHandler = (ev) => {
    if (ev.repeat) return;
    if (!(ev.key in keyAction) || !(ev.type in keyAction[ev.key])) return;
    keyAction[ev.key][ev.type]();
};
['keydown', 'keyup'].forEach((evType) => {
    window.addEventListener(evType, keyHandler);
});


// ! =================== Mouse event-handling Callbacks===========
var g_mousePosX; //prev
var g_mousePosY; //prev
var g_mousePosX_curr;
var g_mousePosY_curr;

(function () { //from https://stackoverflow.com/questions/7790725/javascript-track-mouse-position
    var mousePos;
    document.onmousemove = handleMouseMove;
    setInterval(getMousePosition, 100); // setInterval repeats every X ms

    function handleMouseMove(event) {
        var dot, eventDoc, doc, body, pageX, pageY;
        event = event || window.event; // IE-ism
        // If pageX/Y aren't available and clientX/Y are,
        // calculate pageX/Y - logic taken from jQuery.
        // (This is to support old IE)
        if (event.pageX == null && event.clientX != null) {
            eventDoc = (event.target && event.target.ownerDocument) || document;
            doc = eventDoc.documentElement;
            body = eventDoc.body;

            event.pageX = event.clientX +
                (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
                (doc && doc.clientLeft || body && body.clientLeft || 0);
            event.pageY = event.clientY +
                (doc && doc.scrollTop || body && body.scrollTop || 0) -
                (doc && doc.clientTop || body && body.clientTop || 0);
        }
        mousePos = {
            x: event.pageX,
            y: event.pageY
        };
    }
    function getMousePosition() {
        var pos = mousePos;
        if (pos && g_isCameraFixed) {
            g_mousePosX = pos.x;
            g_mousePosY = pos.y;
            if (g_dx && g_dy) {
                g_prevDx = g_dx;
                g_prevDy = g_dy;
            }
        }
        else if (pos && !g_isCameraFixed) {
            g_mousePosX_curr = pos.x;
            g_mousePosY_curr = pos.y;
            // // to polar coordinate
            // let mouseTheta = calMouseAngle(canvas.width/2, canvas.height/2, pos.x, pos.y);
            // let mouseDist = calMouseDist(canvas.width/2, canvas.height/2, pos.x, pos.y);

            //calculate mouse movement dx and dy
            g_dx = (g_mousePosX - pos.x) / (canvas.width / 2);
            g_dy = (g_mousePosY - pos.y) / (canvas.height / 2);
            if (g_dx != 0 || g_dy != 0) {
                // console.log("increment",0.7 * g_speed * Math.sin(dx+Math.PI), 0.5 * g_speed * Math.sin(dy))
                // console.log("look at:",g_LookX, g_LookY, g_LookZ);
                if (g_prevDx && g_prevDy && g_prevDx != 0 && g_prevDy != 0) {
                    console.log(g_prevDx, g_prevDy)
                    g_dx += g_prevDx;
                    g_dy += g_prevDy;
                }
                if (!isTopView) {
                    // g_EyeX = 0.0, g_EyeY = 0.0, g_EyeZ = 4.25;
                    // g_LookX = 0.0, g_LookY = 0.0, g_LookZ = 0.0;
                    g_LookX = g_EyeX + 0.7 * g_speed * Math.sin(g_dx + Math.PI); //left/right
                    g_LookZ = g_EyeZ + 0.7 * g_speed * Math.cos(g_dx + Math.PI); //left/right
                    g_LookY = g_EyeY + 0.5 * g_speed * Math.sin(g_dy); //up/down
                }
                else {
                    // g_EyeX = 0.0, g_EyeY = 4.25, g_EyeZ = 4.25;
                    // g_LookX = 0.0, g_LookY = 3.3, g_LookZ = 3.5;
                    g_LookX = g_EyeX + 0.7 * g_speed * Math.sin(g_dx + Math.PI); //left/right
                    g_LookY = g_EyeY + 0.5 * g_speed * Math.sin(g_dy) - 0.95; //up/down
                }

            }

        }
    }
})();




function calMouseDist(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}
function calMouseAngle(x1, y1, x2, y2) {
    /* x1, y1 - center, x2, y2 - current position */
    var cosa = (x1 - x2) / Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    var a = Math.acos(cosa); // range from 0 to PI
    if ((x1 - x2 < 0 && y1 - y2 < 0) || (x1 - x2 >= 0 && y1 - y2 < 0)) { //range from 0-2pi
        a = 2 * Math.PI - a;
    }
    return a;
}

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

    if (xp <= 500 && yp <= 600) { //dragging must be in correct place
        g_isDrag = true;
        // console.log("dragging",xp,yp )
    }
    // g_isDrag = true;
    g_xMclik = x;
    g_yMclik = y;
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

    if (currLampPos) {
        currLampPos[1] = currLampPos[1] + 4.0 * (x - g_xMclik);
        currLampPos[2] = currLampPos[2] + 4.0 * (y - g_yMclik);
    }

    // console.log(currLampPos)
    g_lamp0PosY = 4.0 * (x - g_xMclik);
    g_lamp0PosZ = 4.0 * (y - g_yMclik);
    g_eyePosY = 8.0 * (x - g_xMclik);
    g_eyePosZ = 8.0 * (y - g_yMclik);


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
