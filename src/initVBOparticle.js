/*
a single Javascript object (e.g. PartSys prototype or class) 
that contains and defines the entire particle system, including: 
*/
"use strict"

var g_grav = 9.832;	 
var g_drag = 0.985; //friction
var timeStep = 1000.0/60.0;		
// ! Define just one 'bouncy ball' particle
var INIT_VEL = 0.15 * 60.0;		// adjusted by ++Start, --Start buttons.
var xposNow =  0.0;		var yposNow =  0.0;		var zposNow =  0.0;		
var xvelNow = INIT_VEL;	var yvelNow = INIT_VEL;		var zvelNow =  0.0;
var myRunMode = 3;	// particle system state: 0=reset; 1= pause; 2=step; 3=run

function VBO_particle(vertSrc, fragSrc, vertices, particleNum) {
    // ! shader related
    this.VERT_SRC = vertSrc;
    this.FRAG_SRC = fragSrc;
    this.shaderLoc; 

    this.vertices =  new Float32Array(vertices); 
    this.vertexBuffer;
    this.runModeID;
    this.ballShiftID;

    this.a_PosLoc;
    this.u_MvpMatLoc;
    this.MvpMat = new Matrix4(); // Transforms CVV axes to model axes.


    // ! positions
    this.randX = 0;
    this.randY = 0;
    this.randZ = 0;
    this.particleNum = particleNum;

    // ! forces
    this.forceList = [];

    // ! constraints
    this.limitList = [];
}

VBO_particle.prototype.init = function () {
    /*
    argument selects among several different kinds of particle systems 
    and initial conditions.
    */
    this.s1 = new Float32Array(this.particleNum);  // current timestep
    this.s2 = new Float32Array(this.particleNum);  // next timestep
    this.s1dot = new Float32Array(this.particleNum);  // time-derivative

    this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
    if (!this.shaderLoc) {
        console.log(
            this.constructor.name +
                ".init() failed to create executable Shaders on the GPU. Bye!"
        );
        return;
    }else{
        // console.log('You called: '+ this.constructor.name + '.init() fcn!');
    }
    gl.program = this.shaderLoc; 

    // ! init attribute locations 
    this.a_PosLoc = gl.getAttribLocation(this.shaderLoc, "a_Position");
    this.u_MvpMatLoc = gl.getUniformLocation(this.shaderLoc, "u_MvpMatrix");
    if (this.a_PosLoc < 0 || !this.u_MvpMatLoc) {
        console.log(
            this.constructor.name +
                ".init() failed to get the GPU location of attributes"
        );
        return -1; // error exit.
    }


    // * [Vertex] buffer
    this.vertexBuffer = initArrayBufferForLaterUse(gl, this.vertices, 4, gl.FLOAT);
    if (!this.vertexBuffer) {
        console.log(
            this.constructor.name + ".init() failed to create VBO in GPU. Bye! [vertex buffer]"
        );
        return;
    }

    this.runModeID = gl.getUniformLocation(this.shaderLoc, 'u_runMode');
    if(!this.runModeID) {
        console.log('Failed to get u_runMode variable location');
        return;
    }

    this.ballShiftID = gl.getUniformLocation(this.shaderLoc, 'u_ballShift');
    if(!this.ballShiftID) {
        console.log('Failed to get u_ballShift variable location');
        return;
    }

}

VBO_particle.prototype.switchToMe = function () {
    gl.useProgram(this.shaderLoc);
    gl.uniform1i(this.runModeID, g_curRunMode); //bound keyboard callbacks
    gl.uniform4f(this.ballShiftID, xposNow, yposNow, 0.0, 0.0);	// send to gfx system
    
    initAttributeVariable(gl, this.a_PosLoc, this.vertexBuffer);
}

VBO_particle.prototype.isReady = function (){ //very brief sanity check
    var isOK = true;
    if (gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc) {
        console.log(
            this.constructor.name +
                ".isReady() false: shader program at this.shaderLoc not in use!"
        );
        isOK = false;
    }
    return isOK;
}

VBO_particle.prototype.draw = function(g_modelMatrix, g_viewProjMatrix) { //finally drawing🙏
    if (this.isReady() == false) {
        console.log(
            "ERROR! before" +
                this.constructor.name +
                ".draw() call you needed to call this.switchToMe()!!"
        );
    }
    // ! model matrix
    this.MvpMat.set(g_viewProjMatrix);
    this.MvpMat.multiply(g_modelMatrix);
    gl.uniformMatrix4fv(this.u_MvpMatLoc,  false,  this.MvpMat.elements); 

    // ! particle movement
    gl.uniform1i(this.runModeID, g_curRunMode);	// run/step/pause the particle system
    gl.uniform4f(this.ballShiftID, xposNow, yposNow, 0.0, 0.0);	// send to gfx system

    gl.drawArrays(gl.POINTS, 0, this.particleNum); 
}

VBO_particle.prototype.applyAllForces = function () {
    /*
    accepts a state variable 
    and an array of force-applying objects 
    (e.g. a Forcer prototype or class; then make an array of these objects), 
    and applies them to the given state variable
    */

}

VBO_particle.prototype.dotFinder = function () {
    /*
    state variable 's' as an argument 
    computes its time-derivative sDot
    */

}

VBO_particle.prototype.solver = function () {
    /*
    creates s2 contents by approximating integration of s1 over one one timestep.
    */

}

VBO_particle.prototype.doConstraint = function () {
    /*
    accepts state variables s1 and s2 
    an array of constraint-applying objects.  
    This function applies constraints to all changes between s1 and s2, and modifies s2 so that the result meets all the constraints.  
    Currently our only constraints are the 'floor' and walls for our bouncy-ball particles.
    */

}

VBO_particle.prototype.render = function () {
    /*
    updates an existing VBO's contents from state variable (s2) using WebGL's 'bufferSubData()' call, 
    then draws it on-screen.   
    Note that 'bufferSubData()' does not reallocate and GPU memory 
        your new/updated data MUST fit within the GPU memory previously allotted to that VBO.
        https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferSubData 
    */

}

VBO_particle.prototype.swap = function () {
    /*
    exchanges the contents of s1 and s2 by swapping their references (don't copy/recopy all this data!)
    */

}

