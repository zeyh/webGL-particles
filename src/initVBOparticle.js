const PART_XPOS = 0;  //  position    
const PART_YPOS = 1;
const PART_ZPOS = 2;
const PART_WPOS = 3;  // matrix transforms - vector/point distinction
const PART_XVEL = 4;  //  velocity -- ALWAYS a vector: x,y,z; no w. (w==0)    
const PART_YVEL = 5;
const PART_ZVEL = 6;
const PART_X_FTOT = 7;  // force accumulator:'ApplyForces()' fcn clears
const PART_Y_FTOT = 8;  // to zero, then adds each force to each particle.
const PART_Z_FTOT = 9;
const PART_R = 10;  // color : red,green,blue, alpha (opacity); 0<=RGBA<=1.0
const PART_G = 11;
const PART_B = 12;
const PART_MASS = 13;  // mass   
const PART_DIAM = 14;	// on-screen diameter (in pixels)
const PART_RENDMODE = 15;
const PART_MAXVAR = 16; // max index = size of array

const SOLV_NAIVE = 0;       // limited implicit method done 'wrong' in
const SOLV_EULER = 1;       // Euler integration: forward,explicit,...
const SOLV_MIDPOINT = 2;       // Midpoint Method (see Pixar Tutorial)
const SOLV_ADAMS_BASH = 3;       // Adams-Bashforth Explicit Integrator
const SOLV_RUNGEKUTTA = 4;       // Arbitrary degree, set by 'solvDegree'
const SOLV_BACK_EULER = 5;       // 'Backwind' or Implicit Euler
const SOLV_BACK_MIDPT = 6;       // 'Backwind' or Implicit Midpoint
const SOLV_BACK_ADBASH = 7;       // 'Backwind' or Implicit Adams-Bashforth
const SOLV_VERLET = 8;       // Verlet semi-implicit integrator;
const SOLV_VEL_VERLET = 9;       // 'Velocity-Verlet'semi-implicit integrator
const SOLV_LEAPFROG = 10;       // 'Leapfrog' integrator
const SOLV_MAX = 11;       // number of solver types available.
const NU_EPSILON = 10E-15;


function PartSys() {
    this.randX = 0;
    this.randY = 0;
    this.randZ = 0;
}

PartSys.prototype.roundRand = function () {
    /*
    monte carlo sampling pts on unit sphere
    */
    do {
        this.randX = 2.0 * Math.random() - 1.0; // [-1,1]
        this.randY = 2.0 * Math.random() - 1.0;
        this.randZ = 2.0 * Math.random() - 1.0;
    }
    while (this.randX * this.randX +
    this.randY * this.randY +
    this.randZ * this.randZ >= 1.0);
}

PartSys.prototype.initShader = function (vertSrc, fragSrc) {
    this.VERT_SRC = vertSrc;
    this.FRAG_SRC = fragSrc;
    this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
    if (!this.shaderLoc) {
        console.log(
            this.constructor.name +
            ".init() failed to create executable Shaders on the GPU. Bye!"
        );
        return;
    } else {
        // console.log('You called: '+ this.constructor.name + '.init() fcn!');
    }
    gl.program = this.shaderLoc;  // switching gl program to this one

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
    this.MvpMat = new Matrix4(); // Transforms CVV axes to model axes.


}

PartSys.prototype.initBouncy2D = function (count) {
    /*
    argument selects among several different kinds of particle systems 
    and initial conditions.
    */
    this.partCount = count;
    this.s1 = new Float32Array(this.partCount * PART_MAXVAR);
    this.s2 = new Float32Array(this.partCount * PART_MAXVAR);

    this.INIT_VEL = 0.15 * 60.0;
    this.drag = 0.985; //friction force
    this.grav = 9.832; //gravity constant
    this.resti = 1.0; //inelastic
    this.runMode = 3;
    this.solvType = 1;
    this.bounceType = 1;

    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        this.roundRand();
        this.s1[j + PART_XPOS] = -0.8 + 0.1 * this.randX;
        this.s1[j + PART_YPOS] = -0.8 + 0.1 * this.randY;
        this.s1[j + PART_ZPOS] = -0.8 + 0.1 * this.randZ;
        this.s1[j + PART_WPOS] = 1.0;
        this.roundRand();
        this.s1[j + PART_XVEL] = this.INIT_VEL * (0.4 + 0.2 * this.randX);
        this.s1[j + PART_YVEL] = this.INIT_VEL * (0.4 + 0.2 * this.randY);
        this.s1[j + PART_ZVEL] = this.INIT_VEL * (0.4 + 0.2 * this.randZ);
        this.s1[j + PART_MASS] = 1.0;      
        this.s1[j + PART_DIAM] = 2.0 + 10 * Math.random(); // on-screen diameter, in pixels
        this.s1[j + PART_RENDMODE] = 0.0;
        this.s2.set(this.s1);   
    }

    // ! [Vertex] buffer
    this.FSIZE = this.s1.BYTES_PER_ELEMENT;
    this.vboID = gl.createBuffer();
    if (!this.vboID) {
        console.log('PartSys.init() Failed to create the VBO object in the GPU');
        return -1;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboID);
    gl.bufferData(gl.ARRAY_BUFFER, this.s1, gl.DYNAMIC_DRAW);

    this.a_PositionID = gl.getAttribLocation(gl.program, 'a_Position');
    if (this.a_PositionID < 0) {
        console.log('PartSys.init() Failed to get the storage location of a_Position');
        return -1;
    }

    gl.vertexAttribPointer(this.a_PositionID, 4, gl.FLOAT, false, 
        PART_MAXVAR * this.FSIZE, PART_XPOS * this.FSIZE);
    gl.enableVertexAttribArray(this.a_PositionID);

    this.u_runModeID = gl.getUniformLocation(gl.program, 'u_runMode');
    if (!this.u_runModeID) {
        console.log('PartSys.init() Failed to get u_runMode variable location');
        return;
    }
}

PartSys.prototype.switchToMe = function () {
    gl.useProgram(this.shaderLoc);
    gl.uniform1i(this.runModeID, this.runMode); //bound keyboard callbacks

    // ! bindBuffer vertexAttribPointer enableVertexAttribArray
    this.FSIZE = this.s1.BYTES_PER_ELEMENT;
    gl.vertexAttribPointer(this.a_PosLoc, 4, gl.FLOAT, false, PART_MAXVAR * this.FSIZE, PART_XPOS * this.FSIZE);
    // PART_MAXVAR*this.FSIZE,  // Stride: #bytes from 1st stored value to next one
    // PART_XPOS * this.FSIZE); // Offset; #bytes from start of buffer to 1st stored attrib value we will actually use.
    gl.enableVertexAttribArray(this.a_PosLoc);
}

PartSys.prototype.isReady = function () { //very brief sanity check
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


PartSys.prototype.render = function (g_modelMatrix, g_viewProjMatrix) { //finally drawing🙏
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
    gl.uniformMatrix4fv(this.u_MvpMatLoc, false, this.MvpMat.elements);

    // ! particle movement
    // console.log(gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE));
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.s1); 
    gl.uniform1i(this.u_runModeID, this.runMode);	

    // ! drawing
    gl.drawArrays(gl.POINTS, 0, this.partCount);   
}

PartSys.prototype.solver = function () {
    /*
    creates s2 contents by approximating integration of s1 over one one timestep.
    */
    switch (this.solvType) {
        case 0: // EXPLICIT euler s2 = s1 + s1dot*h
            this.swap();
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                g_partA.s2[j + PART_XPOS] += g_partA.s2[j + PART_XVEL] * (g_timeStep * 0.001);
                g_partA.s2[j + PART_YPOS] += g_partA.s2[j + PART_YVEL] * (g_timeStep * 0.001);
                g_partA.s2[j + PART_YVEL] -= g_partA.grav * (g_timeStep * 0.001);
                g_partA.s2[j + PART_XVEL] *= g_partA.drag;
                g_partA.s2[j + PART_YVEL] *= g_partA.drag;
            }
            break;
        case 1: // IMPLICIT or 'reverse time' solver
            this.swap();
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                this.s2[j + PART_YVEL] -= g_partA.grav * (g_timeStep * 0.001);

                this.s2[j + PART_XVEL] *= this.drag;
                this.s2[j + PART_YVEL] *= this.drag;
                this.s2[j + PART_XPOS] += this.s2[j + PART_XVEL] * (g_timeStep * 0.001);
                this.s2[j + PART_YPOS] += this.s2[j + PART_YVEL] * (g_timeStep * 0.001);
            }

            break;
        default:
            console.log('?!?! unknown solver: g_partA.solvType==' + this.solvType);
            break;
    }
    return;
}

PartSys.prototype.doConstraints = function () {
    /*
    accepts state variables s1 and s2 
    an array of constraint-applying objects.  
    This function applies constraints to all changes between s1 and s2, and modifies s2 so that the result meets all the constraints.  
    Currently our only constraints are the 'floor' and walls for our bouncy-ball particles.
    */
    if (this.bounceType == 0) { //------------------------------------------------
        var j = 0;  // i==particle number; j==array index for i-th particle
        for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
            // simple velocity-reversal:
            if (this.s2[j + PART_XPOS] < -0.9 && this.s2[j + PART_XVEL] < 0.0) {
                // bounce on left wall.
                this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL];
            }
            else if (this.s2[j + PART_XPOS] > 0.9 && this.s2[j + PART_XVEL] > 0.0) {
                // bounce on right wall
                this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL];
            } //---------------------------
            if (this.s2[j + PART_YPOS] < -0.9 && this.s2[j + PART_YVEL] < 0.0) {
                // bounce on floor
                this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL];
            }
            else if (this.s2[j + PART_YPOS] > 0.9 && this.s2[j + PART_YVEL] > 0.0) {
                // bounce on ceiling
                this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL];
            } //---------------------------
            if (this.s2[j + PART_ZPOS] < -0.9 && this.s2[j + PART_ZVEL] < 0.0) {
                // bounce on near wall
                this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL];
            }
            else if (this.s2[j + PART_ZPOS] > 0.9 && this.s2[j + PART_ZVEL] > 0.0) {
                // bounce on ceiling
                this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL];
            }
            if (this.s2[j + PART_YPOS] < -0.9) this.s2[PART_YPOS] = -0.9;
            else if (this.s2[j + PART_YPOS] > 0.9) this.s2[PART_YPOS] = 0.9; // ceiling
            if (this.s2[j + PART_XPOS] < -0.9) this.s2[PART_XPOS] = -0.9; // left wall
            else if (this.s2[j + PART_XPOS] > 0.9) this.s2[PART_XPOS] = 0.9; // right wall
        } // end of for-loop thru all particles
    } // end of 'if' for bounceType==0
    else if (this.bounceType == 1) {
        //---------------------------------------------------------------------------
        var j = 0;  // i==particle number; j==array index for i-th particle
        for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
            if (this.s2[j + PART_XPOS] < -0.9 && this.s2[j + PART_XVEL] < 0.0) {
                // collision!  left wall...
                this.s2[j + PART_XPOS] = -0.9;
                this.s2[j + PART_XVEL] = this.s1[j + PART_XVEL];			// we had 
                this.s2[j + PART_XVEL] *= this.drag;
                if (this.s2[j + PART_XVEL] < 0.0)
                    this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL]; // no sign change--bounce!
                else
                    this.s2[j + PART_XVEL] = this.resti * this.s2[j + PART_XVEL];	// sign changed-- don't need another.
                // ('diagnostic printing' code was here in earlier versions.)
            }
            else if (this.s2[j + PART_XPOS] > 0.9 && this.s2[j + PART_XVEL] > 0.0) {	// collision! right wall...
                this.s2[j + PART_XPOS] = 0.9;
                this.s2[j + PART_XVEL] = this.s1[j + PART_XVEL];
                this.s2[j + PART_XVEL] *= this.drag;

                if (this.s2[j + PART_XVEL] > 0.0)
                    this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL];
                else {
                    this.s2[j + PART_XVEL] = this.resti * this.s2[j + PART_XVEL];
                }
            }
            if (this.s2[j + PART_YPOS] < -0.9 && this.s2[j + PART_YVEL] < 0.0) {
                this.s2[j + PART_YPOS] = -0.9;
                this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL];
                this.s2[j + PART_YVEL] *= this.drag;

                if (this.s2[j + PART_YVEL] < 0.0)
                    this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL];
                else {
                    this.s2[j + PART_YVEL] = this.resti * this.s2[j + PART_YVEL];
                }
            }
            else if (this.s2[j + PART_YPOS] > 0.9 && this.s2[j + PART_YVEL] > 0.0) { 		// collision! ceiling...
                this.s2[j + PART_YPOS] = 0.9;
                this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL];
                this.s2[j + PART_YVEL] *= this.drag;
                if (this.s2[j + PART_YVEL] > 0.0)
                    this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL];
                else
                    this.s2[j + PART_YVEL] = this.resti * this.s2[j + PART_YVEL];
            }
            if (this.s2[j + PART_ZPOS] < -0.9 && this.s2[j + PART_ZVEL] < 0.0) {
                // collision!  near wall (negative Z)...
                this.s2[j + PART_ZPOS] = -0.9;
                this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL];
                this.s2[j + PART_ZVEL] *= this.drag;
                if (this.s2[j + PART_ZVEL] < 0.0)
                    this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL];
                else
                    this.s2[j + PART_ZVEL] = this.resti * this.s2[j + PART_ZVEL];
            }
            else if (this.s2[j + PART_ZPOS] > 0.9 && this.s2[j + PART_ZVEL] > 0.0) {	// collision! right wall...
                this.s2[j + PART_ZPOS] = 0.9;
                this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL];
                this.s2[j + PART_ZVEL] *= this.drag;
                if (this.s2[j + PART_ZVEL] > 0.0)
                    this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL];
                else
                    this.s2[j + PART_ZVEL] = this.resti * this.s2[j + PART_ZVEL];
            }
        }
    }
    else {
        console.log('?!?! unknown constraint: PartSys.bounceType==' + this.bounceType);
        return;
    }
}


PartSys.prototype.swap = function () {
    /*
    exchanges the contents of s1 and s2 by swapping their references
    */
    this.s1.set(this.s2);   
}
