"use strict"

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
const PART_AGE = 16;  // # of frame-times until re-initializing
const PART_MAXVAR = 17; // max index = size of array

const SOLV_EULER = 5;       // Euler integration: forward,explicit,...
const SOLV_MIDPOINT = 4;       // Midpoint Method (see Pixar Tutorial)
const SOLV_ADAMS_BASH = 3;       // Adams-Bashforth Explicit Integrator
const SOLV_RUNGEKUTTA = 2;       // Arbitrary degree, set by 'solvDegree'
const SOLV_OLDGOOD = -1;      //  early accidental 'good-but-wrong' solver
const SOLV_BACK_EULER = 1;      // 'Backwind' or Implicit Euler
const SOLV_VEL_VERLET = 0;       // 'Velocity-Verlet'semi-implicit integrator
const SOLV_MAX = 6;      // number of solver types available.
const NU_EPSILON = 10E-15;         // a tiny amount; a minimum vector length

const CONS_BOUNCYBALL0 = 0;
const CONS_BOUNCYBALL1 = 1;
const CONS_FIRE = 2;

var g_currSolverType = 0;

function PartSys() {
    this.randX = 0;
    this.randY = 0;
    this.randZ = 0;
    this.forceList = [];
    this.limitList = [];
    this.MvpMat = new Matrix4(); // Transforms CVV axes to model axes.
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
            ".init() failed to get the GPU location of [a_pos, mvpMatrix]attributes"
        );
        return -1; // error exit.
    }

    // ! [Vertex] buffer
    this.vboID = gl.createBuffer();
    if (!this.vboID) {
        console.log('PartSys.init() Failed to create the VBO object in the GPU');
        return -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboID);
    gl.bufferData(gl.ARRAY_BUFFER, this.s1, gl.DYNAMIC_DRAW);

    this.a_PositionID = gl.getAttribLocation(this.shaderLoc, 'a_Position');
    if (this.a_PositionID < 0) {
        console.log('PartSys.init() Failed to get the storage location of a_Position');
        return -1;
    }

    this.a_ColorID = gl.getAttribLocation(this.shaderLoc, "a_Color");
    if (this.a_ColorID < 0) {
        console.log('PartSys.init() Failed to get a_Color variable location');
        return;
    }

    this.a_ptSizeID = gl.getAttribLocation(this.shaderLoc, 'a_ptSize');
    if (this.a_ptSizeID < 0) {
        console.log('PartSys.init() Failed to get a_ptSize variable location');
        return;
    }

    this.u_runModeID = gl.getUniformLocation(this.shaderLoc, 'u_runMode');
    if (!this.u_runModeID) {
        console.log('PartSys.init() Failed to get u_runMode variable location');
        return;
    }


}

PartSys.prototype.initSand = function (count) {
    /*
    argument selects among several different kinds of particle systems 
    and initial conditions.
    */
    // ! force-causing objects
    var fTmp = new CForcer();       // create a force-causing object, and
    // * earth gravity for all particles:
    fTmp.forceType = F_GRAV_E;      // set it to earth gravity, and
    fTmp.targFirst = 0;             // set it to affect ALL particles:
    fTmp.partCount = -1;            // (negative value means ALL particles and IGNORE all other Cforcer members...)
    this.forceList.push(fTmp);      // append this 'gravity' force object to 

    // fTmp = new CForcer();     
    // fTmp.forceType = F_WIND;     
    // fTmp.targFirst = 0;            
    // fTmp.partCount = -1;           
    // this.forceList.push(fTmp);  

    fTmp = new CForcer();     
    fTmp.forceType = F_DRAG;     
    fTmp.targFirst = 0;            
    fTmp.partCount = -1;           
    this.forceList.push(fTmp);  

    var cTmp = new CLimit();
    cTmp.limitType = LIM_COLLISION;
    cTmp.partFirst = 0;
    cTmp.partCount = -1;
    this.limitList.push(cTmp);

    cTmp = new CLimit();
    cTmp.limitType = LIM_FLOOR;
    cTmp.partFirst = 0;
    cTmp.partCount = -1;
    this.limitList.push(cTmp);

    cTmp = new CLimit();
    cTmp.limitType = LIM_CYLINDER;
    cTmp.partFirst = 0;
    cTmp.partCount = -1;
    this.limitList.push(cTmp);


    // ! ode constants
    this.partCount = count;
    this.s1 = new Float32Array(this.partCount * PART_MAXVAR);
    this.s2 = new Float32Array(this.partCount * PART_MAXVAR);
    this.s1dot = new Float32Array(this.partCount * PART_MAXVAR);

    this.INIT_VEL = 0.15 * 60.0;
    this.runMode = 3;
    this.solvType = g_currSolverType;
    this.CYLINDAR_RAD = 1.8;
    //* initial conditions
    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        this.roundRand(); // * y(0)
        this.s1[j + PART_XPOS] = this.CYLINDAR_RAD * randn_bm();
        this.s1[j + PART_YPOS] = 0.5 + randn_bm();
        this.s1[j + PART_ZPOS] = this.CYLINDAR_RAD * randn_bm();
        this.s1[j + PART_WPOS] = 1.0;
        this.s1[j + PART_R] = 0.3 + randn_bm();
        this.s1[j + PART_G] = 0.3 + randn_bm();
        this.s1[j + PART_B] = 0.4 + randn_bm();
        this.roundRand(); // * y'(0)
        this.s1[j + PART_XVEL] = 20 * (randn_bm() - 0.5);
        this.s1[j + PART_YVEL] = 2 * (randn_bm() - 0.5);
        this.s1[j + PART_ZVEL] = 20 * (randn_bm() - 0.5);
        this.s1[j + PART_DIAM] = 30; // on-screen diameter, in pixels
        this.s1[j + PART_MASS] = this.s1[j + PART_DIAM];
        this.s1[j + PART_RENDMODE] = 0.0;
        this.s1[j + PART_AGE] = 30 + 100 * Math.random();
        this.s2.set(this.s1);
    }
    this.FSIZE = this.s1.BYTES_PER_ELEMENT;
    this.floorstate = new Int8Array(this.partCount);
    for (let i = 0; i < this.floorstate.length; i++) {
        this.floorstate[i] = -1;
    }
    this.accumulated = new Float32Array(this.partCount);
}

PartSys.prototype.findClothProps = function () {
    /*
    find all indexes of mass's neighbors that can apply the 3 force
    @param: this.clothWidth, this.clothHeight
    @return: 2d array consist of 1d [x,(center),y] index neighbor
    */
    this.nStretching = [...Array(this.partCount)];
    this.nSheering = [...Array(this.partCount)];
    this.nBending = [...Array(this.partCount)];
    for (let i = 0; i < this.partCount; i++) {
        this.nStretching[i] = [];
        this.nSheering[i] = [];
        this.nBending[i] = [];
    }
    for (let i = 0; i < this.partCount; i++) { //generate a graph matrix for each prop with bidirectional edges
        //* for manhattan-distance 田 like [Stretching mass spring pair]
        if (i % this.clothWidth == this.clothWidth - 1 && i + this.clothWidth < this.partCount) {
            // this.nStretching.push([i, i + this.clothWidth]); // last column down...|
            this.nStretching[i].push(i + this.clothWidth);
        }
        else if (i + this.clothWidth < this.partCount) {
            // this.nStretching.push([i, i + 1]); // left down -
            // this.nStretching.push([i, i + this.clothWidth]); // |
            this.nStretching[i].push(i + 1);
            this.nStretching[i].push(i + this.clothWidth);
        }
        else if (Math.floor(i / this.clothWidth) == this.clothHeight - 1 && i % this.clothWidth != this.clothWidth - 1) {
            // this.nStretching.push([i, i + 1]); // last row left _
            this.nStretching[i].push(i + 1);
        }

        //* for X-like [Shearing mass spring pair]
        if (i % this.clothWidth != this.clothWidth - 1 && Math.floor(i / this.clothWidth) != this.clothHeight - 1) {
            // this.nSheering.push([i, i + this.clothWidth + 1]) //not last column nor last row \
            this.nSheering[i].push(i + this.clothWidth + 1);
        }
        if (i % this.clothWidth != 0 && Math.floor(i / this.clothWidth) != this.clothHeight - 1) {
            // this.nSheering.push([i, i + this.clothWidth - 1]) //not first column nor last row /
            this.nSheering[i].push(i + this.clothWidth - 1);
        }

        //* for bending - angle change w.r.t. a center particle 田 [left, center, right]
        if (i % this.clothWidth < this.clothWidth - 2) {
            // this.nBending.push([i, i+1, i+2]); //not last two column --
            this.nBending[i].push(i + 2);
        }
        if (Math.floor(i / this.clothWidth) < this.clothHeight - 2) {
            // this.nBending.push([i, i + this.clothWidth, i + this.clothWidth * 2]); //not last two row |
            this.nBending[i].push(i + this.clothWidth * 2);
        }
        if (i % this.clothWidth < this.clothWidth - 2 && Math.floor(i / this.clothWidth) < this.clothHeight - 2) {
            // this.nBending.push([i, i+this.clothWidth+1, i+(this.clothWidth+1)*2]); //not last two column & row \
            this.nBending[i].push(i + (this.clothWidth + 1) * 2);
        }
        if (i % this.clothWidth > 1 && Math.floor(i / this.clothWidth) < this.clothHeight - 2) {
            // this.nBending.push([i, i+this.clothWidth-1, i+(this.clothWidth-1)*2]); //not first two column & last two row /
            this.nBending[i].push(i + (this.clothWidth - 1) * 2);
        }
    }
}

PartSys.prototype.initCloth = function (width, height, spacing) {
    /* 
    ref: http://www.cs.cmu.edu/afs/cs/academic/class/15462-s13/www/ lecture 22 slides
    cloth: 
        internal force: Stretching, Bending, Shearing
        external: Gravity, Drag, etc,
                  sum up the spring damper forces acting on each particle 
    */
    // console.log("🚩");
    // ! force-causing objects
    var fTmp = new CForcer();
    fTmp.forceType = F_SPRINGSET;
    fTmp.targFirst = 0;
    fTmp.partCount = -1;
    this.forceList.push(fTmp);

    fTmp = new CForcer();
    fTmp.forceType = F_DRAG;
    fTmp.targFirst = 0;
    fTmp.partCount = -1;
    this.forceList.push(fTmp);

    fTmp = new CForcer();
    fTmp.forceType = F_GRAV_E;
    fTmp.targFirst = 0;
    fTmp.partCount = -1;
    this.forceList.push(fTmp);

    fTmp = new CForcer();
    fTmp.forceType = F_WIND;
    fTmp.targFirst = 0;
    fTmp.partCount = -1;
    this.forceList.push(fTmp);


    var cTmp = new CLimit();
    cTmp.limitType = LIM_FIXEDPT;
    cTmp.partFirst = 0;
    cTmp.partCount = -1;
    this.limitList.push(cTmp);

    // console.log("\t\t", this.forceList.length, "CForcer objects:");
    // console.log("\t\t", this.limitList.length, "CLimit objects.");

    // ! ode constants
    this.clothWidth = width;
    this.clothHeight = height;
    this.partCount = this.clothWidth * this.clothHeight;
    this.spacing = spacing;
    this.s1 = new Float32Array(this.partCount * PART_MAXVAR);
    this.s2 = new Float32Array(this.partCount * PART_MAXVAR);
    this.s1dot = new Float32Array(this.partCount * PART_MAXVAR);

    this.runMode = 3;
    this.solvType = g_currSolverType;

    //* initial conditions y0
    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        this.s1[j + PART_XPOS] = i % this.clothWidth * this.spacing;
        this.s1[j + PART_YPOS] = -1 * Math.floor(i / this.clothWidth) * this.spacing;
        this.s1[j + PART_ZPOS] = 0.0;
        this.s1[j + PART_WPOS] = 1.0;
        // this.s1[j + PART_R] = 0.2 + 1.0 * i % this.clothWidth / this.partCount;
        // this.s1[j + PART_G] = 0.5 + 1.0 * i % this.clothWidth / this.partCount;
        // this.s1[j + PART_B] = 0.4 + 2.0 * Math.floor(i / this.clothWidth) / this.partCount;
        this.s1[j + PART_R] = 0.55 + 1.0 * i % this.clothWidth / this.partCount;
        this.s1[j + PART_G] = 0.4 + 1.0 * i % this.clothWidth / this.partCount;
        this.s1[j + PART_B] = 0.2 + 2.0 * Math.floor(i / this.clothWidth) / this.partCount;
        this.s1[j + PART_XVEL] = 0.0;
        this.s1[j + PART_YVEL] = 0.0;
        this.s1[j + PART_ZVEL] = 0.0;
        this.s1[j + PART_DIAM] = 8;
        this.s1[j + PART_MASS] = this.s1[j + PART_DIAM] / 1000;
        this.s1[j + PART_RENDMODE] = 0.0;
        this.s1[j + PART_AGE] = 10;
        this.s2.set(this.s1);
    }
    this.FSIZE = this.s1.BYTES_PER_ELEMENT;
    this.findClothProps();
}

PartSys.prototype.initBoid = function (count) {
    // console.log('🐦');
    /* http://www.red3d.com/cwr/boids/
     a) separation, 
     b) cohesion, 
     c) alignment,
     d) evasion
    */
    // ! force-causing objects
    var fTmp = new CForcer();
    fTmp.forceType = F_SEPERATION;
    fTmp.targFirst = 0;
    fTmp.partCount = -1;
    this.forceList.push(fTmp);

    fTmp = new CForcer();
    fTmp.forceType = F_ALIGN;
    fTmp.targFirst = 0;
    fTmp.partCount = -1;
    this.forceList.push(fTmp);

    fTmp = new CForcer();
    fTmp.forceType = F_COHESION;
    fTmp.targFirst = 0;
    fTmp.partCount = -1;
    this.forceList.push(fTmp);

    fTmp = new CForcer();
    fTmp.forceType = F_FLY; //evation
    fTmp.targFirst = 0;
    fTmp.partCount = -1;
    this.forceList.push(fTmp);

    fTmp = new CForcer();
    fTmp.forceType = F_WIND;
    fTmp.targFirst = 0;
    fTmp.partCount = -1;
    this.forceList.push(fTmp);

    // ! Create & init all constraint-causing objects
    var cTmp = new CLimit();        // creat constraint-causing object, and
    cTmp.limitType = LIM_ANCHOR;       // confine particles inside axis-aligned 
    cTmp.partFirst = 0;             // applies to ALL particles; starting at 0 
    cTmp.partCount = -1;            // through all the rest of them.
    this.limitList.push(cTmp);      // append this 'box' constraint object to the

    // console.log("\t\t", this.forceList.length, "CForcer objects:");
    // console.log("\t\t", this.limitList.length, "CLimit objects.");

    // ! ode constants
    this.partCount = count;
    this.s1 = new Float32Array(this.partCount * PART_MAXVAR);
    this.s2 = new Float32Array(this.partCount * PART_MAXVAR);
    this.s1dot = new Float32Array(this.partCount * PART_MAXVAR);

    this.INIT_VEL = 0.15 * 60.0;
    this.runMode = 3;
    this.solvType = g_currSolverType;

    this.neighbors = []; //index for self, ith index array content for its neighbors
    for (let i = 0; i < this.partCount; i++) {
        this.neighbors.push([]);
    }
    this.neighborRadius = params.BoidNeighborSize;

    //* initial conditions
    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        this.roundRand(); // * y(0)
        this.s1[j + PART_XPOS] = 0.0 + 1.0 * this.neighborRadius * this.randX;
        this.s1[j + PART_YPOS] = 0.0 + 1.0 * this.neighborRadius * this.randX;
        this.s1[j + PART_ZPOS] = 0.0 + 1.0 * this.neighborRadius * this.randZ;
        this.s1[j + PART_WPOS] = 1.0;
        this.s1[j + PART_R] = 0.7 + Math.abs(this.randX*0.4);
        this.s1[j + PART_G] = 0.7 + this.randY*0.4;
        this.s1[j + PART_B] = 0.5 + this.randY*0.1;
        this.roundRand(); // * y'(0)
        this.s1[j + PART_XVEL] = this.INIT_VEL * (0.1 + 0.1 * this.randX);
        this.s1[j + PART_YVEL] = this.INIT_VEL * (0.0 + 0.03 * this.randY);
        this.s1[j + PART_ZVEL] = this.INIT_VEL * (0.1 + 0.1 * this.randZ);
        this.s1[j + PART_DIAM] = 2; // on-screen diameter, in pixels
        this.s1[j + PART_MASS] = 1.0;
        this.s1[j + PART_RENDMODE] = 0.0;
        this.s1[j + PART_AGE] = 10 + 100 * Math.random();
        this.s2.set(this.s1);
    }
    this.updateNeighbors();
    this.FSIZE = this.s1.BYTES_PER_ELEMENT;
}

function calEucDist(m1, m2) {
    /*
    calculate the euclidian distance of two particles
    @param: two array of length this.PART_MAXVAR
    @return: a float of the distance between the two particles
    */
    return Math.sqrt(Math.pow(m1[PART_XPOS] - m2[PART_XPOS], 2)
        + Math.pow(m1[PART_YPOS] - m2[PART_YPOS], 2)
        + Math.pow(m1[PART_ZPOS] - m2[PART_ZPOS], 2));
}

function eucDistIndv(x1, y1, z1, x2, y2, z2) {
    /*
    calculate the euclidian distance of two particles
    @param: two array of length this.PART_MAXVAR
    @return: a float of the distance between the two particles
    */
    return Math.sqrt(Math.pow(x1 - x2, 2)
        + Math.pow(y1 - y2, 2)
        + Math.pow(z1 - z2, 2));
}

PartSys.prototype.updateNeighbors = function () {
    for (let i = 0; i < this.partCount; i++) {
        this.neighbors[i] = this.findNeighbors(i);
    }
}

PartSys.prototype.findNeighbors = function (currIdx) {
    /* 
    find all neighbors within the radius for given index's corresponding mass
    @param: current bird's index [0, this.partCount-1]
    @return: an array of current bird's neighbors' index
    */
    // let self = this.s1.slice(currIdx * PART_MAXVAR, currIdx * PART_MAXVAR + PART_MAXVAR);
    var j = 0;
    let neighbors = [];
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        if (i != currIdx) {
            // let currNei = this.s1.slice(j, j + PART_MAXVAR);
            let currDist = eucDistIndv(
                this.s1[currIdx * PART_MAXVAR + PART_XPOS],
                this.s1[currIdx * PART_MAXVAR + PART_YPOS],
                this.s1[currIdx * PART_MAXVAR + PART_ZPOS],
                this.s1[j + PART_XPOS],
                this.s1[j + PART_YPOS],
                this.s1[j + PART_ZPOS]
            );
            if (currDist < this.neighborRadius) {
                neighbors.push(i);
            }
        }
    }
    return neighbors;
}

function findNeighbors(s, currIdx, radius) {
    /* 
    find all neighbors within the radius for given index's corresponding mass
    @param: current bird's index [0, this.partCount-1]
    @return: an array of current bird's neighbors' index
    */
    // let self = this.s1.slice(currIdx * PART_MAXVAR, currIdx * PART_MAXVAR + PART_MAXVAR);
    var j = 0;
    let neighbors = [];
    for (var i = 0; i < s.length / PART_MAXVAR; i += 1, j += PART_MAXVAR) {
        if (i != currIdx) {
            // let currNei = this.s1.slice(j, j + PART_MAXVAR);
            let currDist = eucDistIndv(
                s[currIdx * PART_MAXVAR + PART_XPOS],
                s[currIdx * PART_MAXVAR + PART_YPOS],
                s[currIdx * PART_MAXVAR + PART_ZPOS],
                s[j + PART_XPOS],
                s[j + PART_YPOS],
                s[j + PART_ZPOS]
            );
            if (currDist < radius) {
                neighbors.push(i);
            }
        }
    }
    return neighbors;
}


PartSys.prototype.initFire = function (count) {
    // console.log('🔥');
    // ! force-causing objects
    var fTmp = new CForcer();       // create a force-causing object, and
    fTmp.forceType = F_GRAV_E;      // set it to earth gravity, and
    fTmp.targFirst = 0;             // set it to affect ALL particles:
    fTmp.partCount = -1;            // (negative value means ALL particles and IGNORE all other Cforcer members...)
    this.forceList.push(fTmp);      // append this 'gravity' force object to 
    fTmp = new CForcer();           // create a force-causing object, and
    fTmp.forceType = F_FIRE;      // set it to earth gravity, and
    fTmp.targFirst = 0;             // set it to affect ALL particles:
    fTmp.partCount = -1;            // (negative value means ALL particles and IGNORE all other Cforcer members...)
    this.forceList.push(fTmp);      // append this 'gravity' force object to 

    fTmp = new CForcer();
    fTmp.forceType = F_WIND;
    fTmp.targFirst = 0;
    fTmp.partCount = -1;
    this.forceList.push(fTmp);

    // ! Create & init all constraint-causing objects
    var cTmp = new CLimit();        // creat constraint-causing object, and
    cTmp.limitType = CONS_FIRE;       // confine particles inside axis-aligned 
    // rectangular volume that
    cTmp.partFirst = 0;             // applies to ALL particles; starting at 0 
    cTmp.partCount = -1;            // through all the rest of them.
    this.limitList.push(cTmp);      // append this 'box' constraint object to the

    // console.log("\t\t", this.forceList.length, "CForcer objects:");                           
    // console.log("\t\t", this.limitList.length, "CLimit objects.");

    // ! ode constants
    this.partCount = count;
    this.s1 = new Float32Array(this.partCount * PART_MAXVAR);
    this.s2 = new Float32Array(this.partCount * PART_MAXVAR);
    this.s1dot = new Float32Array(this.partCount * PART_MAXVAR);

    this.INIT_VEL = 0.15 * 60.0;
    this.runMode = 3;
    this.solvType = g_currSolverType;

    //* initial conditions
    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        this.roundRand(); // * y(0)
        this.s1[j + PART_XPOS] = -0.0 + 0.1 * this.randX;
        this.s1[j + PART_YPOS] = -1.0;
        this.s1[j + PART_ZPOS] = -0.0 + 0.1 * this.randZ;
        this.s1[j + PART_WPOS] = 1.0;
        this.s1[j + PART_R] = 1.0;
        this.s1[j + PART_G] = Math.abs(this.randY);
        this.s1[j + PART_B] = Math.abs(this.randZ);
        this.roundRand(); // * y'(0)
        this.s1[j + PART_XVEL] = this.INIT_VEL * (0.0 + 0.05 * this.randX);
        this.s1[j + PART_YVEL] = this.INIT_VEL * (0.3 + 0.3 * this.randY);
        this.s1[j + PART_ZVEL] = this.INIT_VEL * (0.0 + 0.05 * this.randZ);
        this.s1[j + PART_DIAM] = 40 * Math.random(); // on-screen diameter, in pixels
        this.s1[j + PART_MASS] = this.s1[j + PART_DIAM];
        this.s1[j + PART_RENDMODE] = 0.0;
        this.s1[j + PART_AGE] = 10 + 100 * Math.random();
        this.s2.set(this.s1);
    }
    this.centroid = findCentroid(this.s1);
    this.FSIZE = this.s1.BYTES_PER_ELEMENT;
}

PartSys.prototype.initSpring = function (count) {
    // console.log('spring mass now');
    // ! force-causing objects
    var fTmp = new CForcer();       // create a NEW CForcer object 
    fTmp.forceType = F_SPRING;
    fTmp.e1 = 0;
    fTmp.e2 = 1;
    fTmp.targFirst = 0;
    fTmp.partCount = -1;
    this.forceList.push(fTmp);

    fTmp = new CForcer();       // create a NEW CForcer object 
    fTmp.forceType = F_DRAG;
    fTmp.Kdrag = fTmp.K_springDamp;
    fTmp.targFirst = 0;             // apply it to ALL particles:
    fTmp.partCount = -1;
    this.forceList.push(fTmp);

    // console.log("\t\t", this.forceList.length, "CForcer objects:");
    // for (i = 0; i < this.forceList.length; i++) {
    //     console.log("CForceList[", i, "]");
    //     this.forceList[i].printMe();
    // }
    // ! ode constants
    this.partCount = count;
    this.s1 = new Float32Array(this.partCount * PART_MAXVAR);
    this.s2 = new Float32Array(this.partCount * PART_MAXVAR);
    this.s1dot = new Float32Array(this.partCount * PART_MAXVAR);

    this.INIT_VEL = 0.15 * 60.0;
    this.drag = 0.985; //friction force
    this.grav = 9.832; //gravity constant
    this.resti = 1.0; //inelastic
    this.runMode = 3;
    this.solvType = g_currSolverType;

    //* initial conditions y0
    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        this.roundRand(); // * y(0)
        this.s1[j + PART_XPOS] = (i % 2 == 1) ? 0.2 : -0.2;
        this.s1[j + PART_YPOS] = 0.0;
        this.s1[j + PART_ZPOS] = 0.0;
        this.s1[j + PART_WPOS] = 1.0;
        this.s1[j + PART_R] = 0.9;
        this.s1[j + PART_G] = 0.5 + Math.abs(this.randY) * 0.5;
        this.s1[j + PART_B] = Math.abs(this.randZ);
        this.roundRand(); // * y'(0)
        this.s1[j + PART_XVEL] = 0.0;
        this.s1[j + PART_YVEL] = 0.0;
        this.s1[j + PART_ZVEL] = 0.0;
        this.s1[j + PART_DIAM] = 10;
        this.s1[j + PART_MASS] = this.s1[j + PART_DIAM] / 100;
        this.s1[j + PART_RENDMODE] = 0.0;
        this.s1[j + PART_AGE] = 10;
        this.s2.set(this.s1);
    }
    this.FSIZE = this.s1.BYTES_PER_ELEMENT;
}

PartSys.prototype.initBouncy3D = function (count) {
    /*
    argument selects among several different kinds of particle systems 
    and initial conditions.
    */
    // ! force-causing objects
    var fTmp = new CForcer();       // create a force-causing object, and
    // * earth gravity for all particles:
    fTmp.forceType = F_GRAV_E;      // set it to earth gravity, and
    fTmp.targFirst = 0;             // set it to affect ALL particles:
    fTmp.partCount = -1;            // (negative value means ALL particles and IGNORE all other Cforcer members...)
    this.forceList.push(fTmp);      // append this 'gravity' force object to 
    // the forceList array of force-causing objects.
    // * drag for all particles:
    fTmp = new CForcer();           // create a NEW CForcer object 
    fTmp.forceType = F_DRAG;        // Viscous Drag
    fTmp.Kdrag = 0.15;              // in Euler solver, scales velocity by 0.85
    fTmp.targFirst = 0;             // apply it to ALL particles:
    fTmp.partCount = -1;
    this.forceList.push(fTmp);

    // ! Create & init all constraint-causing objects
    var cTmp = new CLimit();        // creat constraint-causing object, and
    cTmp.hitType = HIT_BOUNCE_VEL;  // set how particles 'bounce' from its surface,
    cTmp.limitType = CONS_BOUNCYBALL1;       // confine particles inside axis-aligned 
    // rectangular volume that
    cTmp.partFirst = 0;             // applies to ALL particles; starting at 0 
    cTmp.partCount = -1;            // through all the rest of them.
    cTmp.xMin = -1.0; cTmp.xMax = 1.0;  // box extent:  +/- 1.0 box at origin
    cTmp.yMin = -1.0; cTmp.yMax = 1.0;
    cTmp.zMin = -1.0; cTmp.zMax = 1.0;
    cTmp.Kresti = 1.0;              // bouncyness: coeff. of restitution.
    // (and IGNORE all other CLimit members...)
    this.limitList.push(cTmp);      // append this 'box' constraint object to the
    // 'limitList' array of constraint-causing objects.                                

    // ! ode constants
    this.partCount = count;
    this.s1 = new Float32Array(this.partCount * PART_MAXVAR);
    this.s2 = new Float32Array(this.partCount * PART_MAXVAR);
    this.s1dot = new Float32Array(this.partCount * PART_MAXVAR);

    this.INIT_VEL = 0.15 * 60.0;
    this.drag = 0.985; //friction force
    this.grav = 9.832; //gravity constant
    this.resti = 1.0; //inelastic
    this.runMode = 3;
    this.solvType = g_currSolverType;

    //* initial conditions
    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        this.roundRand(); // * y(0)
        this.s1[j + PART_XPOS] = -0.8 + 0.1 * this.randX;
        this.s1[j + PART_YPOS] = -0.8 + 0.1 * this.randY;
        this.s1[j + PART_ZPOS] = -0.8 + 0.1 * this.randZ;
        this.s1[j + PART_WPOS] = 1.0;
        this.s1[j + PART_R] = Math.abs(this.randX);
        this.s1[j + PART_G] = Math.abs(this.randY);
        this.s1[j + PART_B] = 0.9;
        this.roundRand(); // * y'(0)
        this.s1[j + PART_XVEL] = this.INIT_VEL * (0.4 + 0.2 * this.randX);
        this.s1[j + PART_YVEL] = this.INIT_VEL * (0.4 + 0.2 * this.randY);
        this.s1[j + PART_ZVEL] = this.INIT_VEL * (0.4 + 0.2 * this.randZ);
        this.s1[j + PART_DIAM] = 40 * Math.random(); // on-screen diameter, in pixels
        this.s1[j + PART_MASS] = this.s1[j + PART_DIAM];
        this.s1[j + PART_RENDMODE] = 0.0;
        this.s1[j + PART_AGE] = 30 + 100 * Math.random();
        this.s2.set(this.s1);
    }
    this.FSIZE = this.s1.BYTES_PER_ELEMENT;
}

PartSys.prototype.switchToMe = function () {
    gl.useProgram(this.shaderLoc);
    gl.uniform1i(this.runModeID, this.runMode); //bound keyboard callbacks

    // ! bindBuffer vertexAttribPointer enableVertexAttribArray
    this.FSIZE = this.s1.BYTES_PER_ELEMENT;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboID); // ! 👈 finally debugged......

    gl.vertexAttribPointer(this.a_PositionID, 4, gl.FLOAT, false,
        PART_MAXVAR * this.FSIZE, PART_XPOS * this.FSIZE);
    gl.enableVertexAttribArray(this.a_PositionID);

    gl.vertexAttribPointer(this.a_ColorID, 4, gl.FLOAT, false,
        PART_MAXVAR * this.FSIZE, PART_R * this.FSIZE);
    gl.enableVertexAttribArray(this.a_ColorID);

    gl.vertexAttribPointer(this.a_ptSizeID, 1, gl.FLOAT, false,
        PART_MAXVAR * this.FSIZE, PART_DIAM * this.FSIZE);
    gl.enableVertexAttribArray(this.a_ptSizeID);

}

function randn_bm() {
    /*
    from: https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
    uses the Box–Muller transform to give you a normal distribution between 0 and 1 inclusive
    */
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) return randn_bm(); // resample between 0 and 1
    return num;
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

PartSys.prototype.applySpringForce = function (s, forceList, springConst, currIdx, neighborIdx, centerIdx) {
    /*
    @param: overall particles, forceConstants, the index of currentMass, idx of its connected mass
    @return: no return, but will change the  PART_X_FTOT,PART_Y_FTOT,PART_Z_FTOT of currentMass
    𝑚𝑥¨1=−𝑘(𝑥1−𝑥2+𝑙) https://physics.stackexchange.com/questions/61809/two-masses-attached-to-a-spring
    𝑚𝑥¨2=−𝑘(𝑥2−𝑥1−𝑙)
    Note: -1*(1-2*m) map {0,1} to {-1,1} indicating the sign
    */
    let eucDist = eucDistIndv(
        s[currIdx * PART_MAXVAR + PART_XPOS], s[currIdx * PART_MAXVAR + PART_YPOS], s[currIdx * PART_MAXVAR + PART_ZPOS],
        s[neighborIdx * PART_MAXVAR + PART_XPOS], s[neighborIdx * PART_MAXVAR + PART_YPOS], s[neighborIdx * PART_MAXVAR + PART_ZPOS]
    );
    s[currIdx * PART_MAXVAR + PART_X_FTOT] += springConst * (eucDist - forceList.springEqualibrium)
        * (s[neighborIdx * PART_MAXVAR + PART_XPOS] - s[currIdx * PART_MAXVAR + PART_XPOS]) / eucDist;
    s[currIdx * PART_MAXVAR + PART_Y_FTOT] += springConst * (eucDist - forceList.springEqualibrium)
        * (s[neighborIdx * PART_MAXVAR + PART_YPOS] - s[currIdx * PART_MAXVAR + PART_YPOS]) / eucDist;
    s[currIdx * PART_MAXVAR + PART_Z_FTOT] += springConst * (eucDist - forceList.springEqualibrium)
        * (s[neighborIdx * PART_MAXVAR + PART_ZPOS] - s[currIdx * PART_MAXVAR + PART_ZPOS]) / eucDist;

    s[neighborIdx * PART_MAXVAR + PART_X_FTOT] -= springConst * (eucDist - forceList.springEqualibrium)
        * (s[neighborIdx * PART_MAXVAR + PART_XPOS] - s[currIdx * PART_MAXVAR + PART_XPOS]) / eucDist;
    s[neighborIdx * PART_MAXVAR + PART_Y_FTOT] -= springConst * (eucDist - forceList.springEqualibrium)
        * (s[neighborIdx * PART_MAXVAR + PART_YPOS] - s[currIdx * PART_MAXVAR + PART_YPOS]) / eucDist;
    s[neighborIdx * PART_MAXVAR + PART_Z_FTOT] -= springConst * (eucDist - forceList.springEqualibrium)
        * (s[neighborIdx * PART_MAXVAR + PART_ZPOS] - s[currIdx * PART_MAXVAR + PART_ZPOS]) / eucDist;
}

PartSys.prototype.applyForces = function (s, fList, currType) {
    var j = 0;  // i==particle number; j==array index for i-th particle
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        s[j + PART_X_FTOT] = 0.0;
        s[j + PART_Y_FTOT] = 0.0;
        s[j + PART_Z_FTOT] = 0.0;
    }
    for (var k = 0; k < fList.length; k++) {  // for every CForcer in fList array,
        //    console.log("fList[k].forceType:", fList[k].forceType);
        if (fList[k].forceType <= 0) {     //.................Invalid force? SKIP IT!
            // if forceType is F_NONE, or if forceType was 
            continue;         // negated to (temporarily) disable the CForcer,
        }

        var m = fList[k].targFirst;   // first affected particle # in our state 's'
        var mmax = this.partCount;    // Total number of particles in 's'
        // (last particle number we access is mmax-1)
        if (fList[k].targCount == 0) {    // ! Apply force to e1,e2 particles only!
            m = mmax = 0;   // don't let loop run; apply force to e1,e2 particles only.
        }
        else if (fList[k].targCount > 0) {
            // YES! force applies to 'targCount' particles starting with particle # m:
            var tmp = fList[k].targCount;
            if (tmp < mmax) mmax = tmp;    // (but MAKE SURE mmax doesn't get larger)
            else console.log("\n\n!!PartSys.applyForces() index error!!\n\n");
        }
        // console.log("m:",m,"mmax:",mmax);
        // m and mmax are now correctly initialized; use them!  
        if (fList[k].forceType == F_SEPERATION
            || fList[k].forceType == F_ALIGN
            || fList[k].forceType == F_COHESION) {
            this.updateNeighbors();
        }
        switch (fList[k].forceType) {
            case F_FIRE:
                var j = m * PART_MAXVAR;  // state var array index for particle # m
                for (; m < mmax; m++, j += PART_MAXVAR) { // for every part# from m to mmax-1,
                    let eucDist = eucDistIndv(
                        this.centroid[0], this.centroid[1], this.centroid[2],
                        s[j + PART_XPOS], s[j + PART_YPOS], s[j + PART_ZPOS]
                    ) / (Math.sqrt(2) / 2);
                    let RGBsum = eucDist * (fList[k].fireRedDecay + fList[k].fireGreenDecay + fList[k].fireBlueDecay);
                    // // s[j + PART_R] -=  eucDist  * fList[k].fireRedDecay/RGBsum;
                    // // s[j + PART_G] -= eucDist  * fList[k].fireGreenDecay/RGBsum;
                    // s[j + PART_B] -= eucDist * fList[k].fireBlueDecay / RGBsum;
                    // s[j + PART_R] =  eucDist;
                    this.roundRand();
                    // s[j + PART_G] += fList[k].fireGreenDecay == 0 ? 0 : eucDist * fList[k].fireGreenDecay;
                    s[j + PART_B] = eucDist * fList[k].fireBlueDecay;

                    s[j + PART_DIAM] -= eucDist * fList[k].fireDiamDecay;
                    s[j + PART_MASS] = s[j + PART_DIAM] * fList[k].fireMassDecay;
                }
                break;
            case F_MOUSE:     // Spring-like connection to mouse cursor
                console.log("PartSys.applyForces(), fList[", k, "].forceType:",
                    fList[k].forceType, "NOT YET IMPLEMENTED!!");
                break;
            case F_GRAV_E:    // Earth-gravity pulls 'downwards' as defined by downDir
                if (this.floorstate == undefined) {
                    var j = m * PART_MAXVAR;  // state var array index for particle # m
                    for (; m < mmax; m++, j += PART_MAXVAR) { // for every part# from m to mmax-1,
                        // force from gravity == mass * gravConst * downDirection
                        s[j + PART_X_FTOT] += s[j + PART_MASS] * fList[k].gravConst *
                            fList[k].downDir.elements[0];
                        s[j + PART_Y_FTOT] += s[j + PART_MASS] * fList[k].gravConst *
                            fList[k].downDir.elements[1];
                        s[j + PART_Z_FTOT] += s[j + PART_MASS] * fList[k].gravConst *
                            fList[k].downDir.elements[2];
                    }
                }

                else if (Math.min.apply(Math, this.floorstate) < 0) {
                    var j = m * PART_MAXVAR;  // state var array index for particle # m
                    for (; m < mmax; m++, j += PART_MAXVAR) { // for every part# from m to mmax-1,
                        // force from gravity == mass * gravConst * downDirection
                        s[j + PART_X_FTOT] += s[j + PART_MASS] * fList[k].gravConst *
                            fList[k].downDir.elements[0];
                        s[j + PART_Y_FTOT] += s[j + PART_MASS] * fList[k].gravConst *
                            fList[k].downDir.elements[1];
                        s[j + PART_Z_FTOT] += s[j + PART_MASS] * fList[k].gravConst *
                            fList[k].downDir.elements[2];
                    }
                }
                else { //should be steady system
                }
                break;
            case F_GRAV_P:    // planetary gravity between particle # e1 and e2.
                console.log("PartSys.applyForces(), fList[", k, "].forceType:",
                    fList[k].forceType, "NOT YET IMPLEMENTED!!");
                break;
            case F_WIND:      // Blowing-wind-like force-field; fcn of 3D position
                var j = m * PART_MAXVAR;  // state var array index for particle # m
                let dx = 0; //(g_curMousePosX4Boid - canvas.width / 2) / canvas.width / 2;
                let dy = 0; //(g_curMousePosY4Boid - canvas.height / 2) / canvas.height / 2;
                let dz = 0;
                if(g_isDrag){
                    dx = g_xMdragTot;
                    dy = g_yMdragTot;
                }
                
                if(currType == CLOTH){
                    dx *= 0.5;
                    dy *= 0.5;
                    // if(dx > 0){
                    //     dx = Math.min(dx, 0.6);
                    // }
                    // else{
                    //     dx = Math.max(dx, -0.6);
                    // }
                    // if(dy > 0){
                    //     dy = Math.min(dy, 0.6);
                    // }
                    // else{
                    //     dy = Math.max(dy, -0.6);
                    // }
                }   
                if(currType == BOID){
                    dx *= 10;
                    dy *= 10;
                } 
                for (; m < mmax; m++, j += PART_MAXVAR) { // for every part# from m to mmax-1,
                    s[j + PART_X_FTOT] += dx;
                    s[j + PART_Y_FTOT] += dy;
                    s[j + PART_Z_FTOT] += dz;
                }
                break;
            case F_BUBBLE:    // Constant inward force (bub_force)to a 3D centerpoint 
                // bub_ctr if particle is > bub_radius away from it.
                console.log("PartSys.applyForces(), fList[", k, "].forceType:",
                    fList[k].forceType, "NOT YET IMPLEMENTED!!");
                break;
            case F_DRAG:      // viscous drag: force = -K_drag * velocity.
                var j = m * PART_MAXVAR;  // state var array index for particle # m
                for (; m < mmax; m++, j += PART_MAXVAR) { // for every particle# from m to mmax-1,
                    // force from gravity == mass * gravConst * downDirection
                    s[j + PART_X_FTOT] -= (fList[k].K_drag) * s[j + PART_XVEL];
                    s[j + PART_Y_FTOT] -= (fList[k].K_drag) * s[j + PART_YVEL];
                    s[j + PART_Z_FTOT] -= (fList[k].K_drag) * s[j + PART_ZVEL];
                }
                break;
            case F_SPRING:
                // 𝑚𝑥¨1=−𝑘(𝑥1−𝑥2+𝑙) https://physics.stackexchange.com/questions/61809/two-masses-attached-to-a-spring
                // 𝑚𝑥¨2=−𝑘(𝑥2−𝑥1−𝑙)
                //get mass 1 and mass 2
                let m1 = s.slice(0, fList[k].e2 * PART_MAXVAR);
                let m2 = s.slice(fList[k].e2 * PART_MAXVAR, s.length);
                //calculate x1 - x2
                let eucDist = Math.sqrt(Math.pow(m1[PART_XPOS] - m2[PART_XPOS], 2)
                    + Math.pow(m1[PART_YPOS] - m2[PART_YPOS], 2)
                    + Math.pow(m1[PART_ZPOS] - m2[PART_ZPOS], 2));
                var j = m * PART_MAXVAR; //* Note: -1*(1-2*m) map {0,1} to {-1,1} indicating the sign
                for (; m < mmax; m++, j += PART_MAXVAR) {
                    s[j + PART_X_FTOT] += (m2[PART_XPOS] - m1[PART_XPOS]) / eucDist * fList[k].K_spring
                        * (eucDist - fList[k].K_restLength) / s[j + PART_MASS]
                        * (1 - 2 * m);
                    s[j + PART_Y_FTOT] += (m2[PART_YPOS] - m1[PART_YPOS]) / eucDist * fList[k].K_spring
                        * (eucDist - fList[k].K_restLength) / s[j + PART_MASS]
                        * (1 - 2 * m);
                    s[j + PART_Z_FTOT] += (m2[PART_ZPOS] - m1[PART_ZPOS]) / eucDist * fList[k].K_spring
                        * (eucDist - fList[k].K_restLength) / s[j + PART_MASS]
                        * (1 - 2 * m);
                }
                break;
            case F_SPRINGSET: //Cloth here
                for (let i = 0; i < this.partCount; i++) {
                    for (let j = 0; j < this.nStretching[i].length; j++) {
                        this.applySpringForce(s, fList[k], fList[k].kStretch, i, this.nStretching[i][j]);
                    }
                    for (let j = 0; j < this.nSheering[i].length; j++) {
                        this.applySpringForce(s, fList[k], fList[k].kSheer, i, this.nSheering[i][j]);
                    }
                    for (let j = 0; j < this.nBending[i].length; j++) {
                        this.applySpringForce(s, fList[k], fList[k].kBend, i, this.nBending[i][j]);
                    }
                }
                break;
            case F_CHARGE:
                console.log("PartSys.applyForces(), fList[", k, "].forceType:",
                    fList[k].forceType, "NOT YET IMPLEMENTED!!");
                break;
            case F_SEPERATION: //collision avoidance
                var j = m * PART_MAXVAR;  // state var array index for particle # m
                for (; m < mmax; m++, j += PART_MAXVAR) { // for every particle# from m to mmax-1,
                    this.updateNeighbors();
                    // * - fList[k].kSep / distance * xpos
                    // let curMass = s.slice(j, j + PART_MAXVAR);
                    let curNeighbors = this.neighbors[m];
                    if (curNeighbors.length > 0) {
                        for (let idx = 0; idx < curNeighbors.length; idx++) { //for each neighbor
                            let nIdx = curNeighbors[idx]; //currentNeighbor's index in the s array
                            // let currNeighbor = s.slice(nIdx, nIdx + PART_MAXVAR); //retrieve true neighbor particle
                            // console.log("should be something small",nIdx);
                            let dist = eucDistIndv(
                                s[j + PART_XPOS], s[j + PART_YPOS], s[j + PART_ZPOS],
                                s[nIdx * PART_MAXVAR + PART_XPOS], s[nIdx * PART_MAXVAR + PART_YPOS], s[nIdx * PART_MAXVAR + PART_ZPOS]
                            );
                            s[j + PART_X_FTOT] -= fList[k].kSep / dist
                                * (s[nIdx * PART_MAXVAR + PART_XPOS] - s[j + PART_XPOS]);
                            s[j + PART_Y_FTOT] -= fList[k].kSep / dist
                                * (s[nIdx * PART_MAXVAR + PART_YPOS] - s[j + PART_YPOS]);
                            s[j + PART_Z_FTOT] -= fList[k].kSep / dist
                                * (s[nIdx * PART_MAXVAR + PART_ZPOS] - s[j + PART_ZPOS]);
                        }
                    }
                }
                break;
            case F_ALIGN:
                var j = m * PART_MAXVAR;  // state var array index for particle # m
                for (; m < mmax; m++, j += PART_MAXVAR) { // for every particle# from m to mmax-1,
                    // * adjust i's velocity to neighbors
                    // * kv * (vj - vi)
                    this.updateNeighbors();
                    let curNeighbors = this.neighbors[m];
                    if (curNeighbors.length > 0) {
                        for (let idx = 0; idx < curNeighbors.length; idx++) { //for each neighbor
                            let nIdx = curNeighbors[idx]; //currentNeighbor's index in the s array
                            s[j + PART_X_FTOT] += fList[k].kVel
                                * (s[nIdx * PART_MAXVAR + PART_XVEL] - s[j + PART_XVEL]);
                            s[j + PART_Y_FTOT] += fList[k].kVel
                                * (s[nIdx * PART_MAXVAR + PART_YVEL] - s[j + PART_YVEL]);
                            s[j + PART_Z_FTOT] += fList[k].kVel
                                * (s[nIdx * PART_MAXVAR + PART_ZVEL] - s[j + PART_ZVEL]);
                        }
                        // console.log(s)
                    }
                }
                break;
            case F_COHESION: //centering
                var j = m * PART_MAXVAR;  // state var array index for particle # m
                for (; m < mmax; m++, j += PART_MAXVAR) { // for every particle# from m to mmax-1,
                    // * pull boid i towards j
                    // * kc * Xij
                    this.updateNeighbors();
                    let curNeighbors = this.neighbors[m];
                    if (curNeighbors.length > 0) {
                        for (let idx = 0; idx < curNeighbors.length; idx++) { //for each neighbor
                            let nIdx = curNeighbors[idx]; //currentNeighbor's index in the s array
                            s[j + PART_X_FTOT] += fList[k].kCen
                                * (s[nIdx * PART_MAXVAR + PART_XPOS] - s[j + PART_XPOS]);
                            s[j + PART_Y_FTOT] += fList[k].kCen
                                * (s[nIdx * PART_MAXVAR + PART_YPOS] - s[j + PART_YPOS]);
                            s[j + PART_Z_FTOT] += fList[k].kCen
                                * (s[nIdx * PART_MAXVAR + PART_ZPOS] - s[j + PART_ZPOS]);
                        }
                        // console.log(this.neighbors)
                        // console.log(s)
                    }
                }
                break;
            case F_FLY:    // UNUSED - Implemented in constraints
                var j = m * PART_MAXVAR;  // state var array index for particle # m
                let VEL_THRESHOLD = 0.5;
                let dir = flyingDir(findCentroid(s), [0, 0, 0], 0.2);
                for (; m < mmax; m++, j += PART_MAXVAR) {
                    // * for centroid of boids follow mouse FIXME: minus the centroid...
                    if (g_curMousePosX4Boid && g_curMousePosY4Boid) {
                        let dx = (g_curMousePosX4Boid - canvas.width / 2) / canvas.width / 2;
                        let dy = (g_curMousePosY4Boid - canvas.height / 2) / canvas.height / 2;
                        if(g_isDrag){
                            dx = g_xMdragTot;
                            dy = g_yMdragTot;

                        }
                        // console.log(dx, dy);
                        var j = m * PART_MAXVAR;  // state var array index for particle # m
                        for (; m < mmax; m++, j += PART_MAXVAR) { // for every particle# from m to mmax-1,
                            // force from gravity == mass * gravConst * downDirection
                            s[j + PART_X_FTOT] += (fList[k].kFly) * dx;
                            s[j + PART_Y_FTOT] += (fList[k].kFly) * dy;
                            s[j + PART_Z_FTOT] += (fList[k].kFly) * dy;
                        }
                    }
                    // * to let particles that near a region flying away
                    // s[j + PART_X_FTOT] += dir[0] * s[j + PART_MASS] * fList[k].kFly;
                    // s[j + PART_Y_FTOT] += dir[1] * s[j + PART_MASS] * fList[k].kFly;
                    // s[j + PART_Z_FTOT] += dir[2] * s[j + PART_MASS] * fList[k].kFly;

                    // * for particles that's not moving(VEL_THRESHOLD)... let it move randomly
                    // let randomSeed = Math.random();
                    // let sign = randomSeed < 0.5 ? -1 : 1;
                    // // force from gravity == mass * gravConst * downDirection
                    // if (eucDistIndv(s[j + PART_XVEL], s[j + PART_YVEL], s[j + PART_ZVEL], 0, 0, 0) < VEL_THRESHOLD) {
                    //     // console.log(sign * s[j + PART_MASS] * fList[k].kFly)
                    //     // console.log(s[j + PART_XVEL], s[j + PART_YVEL], s[j + PART_ZVEL]);
                    //     s[j + PART_X_FTOT] += sign * s[j + PART_MASS] * fList[k].kFly;
                    //     s[j + PART_Y_FTOT] += sign * s[j + PART_MASS] * fList[k].kFly;
                    //     s[j + PART_Z_FTOT] += sign * s[j + PART_MASS] * fList[k].kFly;
                    // }

                    // * for all particles move randomly
                    // s[j + PART_X_FTOT] += Math.random() * s[j + PART_MASS] * fList[k].kFly *
                    //     fList[k].flyDir.elements[0];
                    // s[j + PART_Y_FTOT] += s[j + PART_MASS] * fList[k].kFly *
                    //     fList[k].flyDir.elements[1];
                    // s[j + PART_Z_FTOT] += s[j + PART_MASS] * fList[k].kFly *
                    //     fList[k].flyDir.elements[2];
                }
                break;
            default:
                console.log("!!!ApplyForces() fList[", k, "] invalid forceType:", fList[k].forceType);
                break;
        } // switch(fList[k].forceType)
    } // for(k=0...)
}

function flyingDir(centroid, sphereCenter, stepAngle) {
    let sphereRad = params.BoidBoundarySize;
    let cenDist = eucDistIndv(
        sphereCenter[0], sphereCenter[1], sphereCenter[2],
        centroid[0], centroid[1], centroid[2]);
    let p1 = [centroid[0] * sphereRad / cenDist, centroid[1] * sphereRad / cenDist, centroid[2] * sphereRad / cenDist];
    let p2 = [p1[0], p1[1], p1[2] * Math.cos(stepAngle)];
    let p2Dist = eucDistIndv(
        sphereCenter[0], sphereCenter[1], sphereCenter[2],
        p2[0], p2[1], p2[2]);
    let p2Normalized = [p2[0] * sphereRad / p2Dist, p2[1] * sphereRad / p2Dist, p2[2] * sphereRad / p2Dist];
    return [p2Normalized[0] - p1[0], p2Normalized[1] - p1[1], p2Normalized[2] - p1[2]];
}

PartSys.prototype.dotFinder = function (dest, src) {
    /* 
    numerical differentiation for time derivative
    src -> given y'(0) (& y''(0) from applyForce())
    dest -> compute y(1) & y'(1)
    */
    var invMass;  // inverse mass
    var j = 0;  // i==particle number; j==array index for i-th particle
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        dest[j + PART_XPOS] = src[j + PART_XVEL];   // position derivative = velocity
        dest[j + PART_YPOS] = src[j + PART_YVEL];
        dest[j + PART_ZPOS] = src[j + PART_ZVEL];
        dest[j + PART_WPOS] = 0.0;                  // presume 'w' fixed at 1.0
        // Use 'src' current force-accumulator's values (set by PartSys.applyForces())
        // to find acceleration.  As multiply is FAR faster than divide, do this:
        invMass = 1.0 / src[j + PART_MASS];   // F=ma, so a = F/m, or a = F(1/m);
        dest[j + PART_XVEL] = src[j + PART_X_FTOT] * invMass;
        dest[j + PART_YVEL] = src[j + PART_Y_FTOT] * invMass;
        dest[j + PART_ZVEL] = src[j + PART_Z_FTOT] * invMass;
        dest[j + PART_X_FTOT] = 0.0;  // we don't know how force changes with time;
        dest[j + PART_Y_FTOT] = 0.0;  // presume it stays constant during timestep.
        dest[j + PART_Z_FTOT] = 0.0;
        dest[j + PART_R] = 0.0;       // presume color doesn't change with time.
        dest[j + PART_G] = 0.0;
        dest[j + PART_B] = 0.0;
        dest[j + PART_MASS] = 0.0;    // presume mass doesn't change with time.
        dest[j + PART_DIAM] = 0.0;    // presume these don't change either...   
        dest[j + PART_RENDMODE] = 0.0;
        dest[j + PART_AGE] = 0.0;
    }
}

PartSys.prototype.solver = function () {
    /*
    creates s2 contents by approximating integration of s1 over one one timestep.
    */
    switch (this.solvType) {
        case SOLV_EULER: // EXPLICIT euler s2 = s1 + s1dot*h
            //y(j,1)=y(j-1,1)+h*f(x(j-1,1),y(j-1,1));
            for (var n = 0; n < this.s1.length; n++) { // for all elements in s1,s2,s1dot;
                this.s2[n] = this.s1[n] + this.s1dot[n] * (g_timeStep * 0.001);
            }
            break;
        case SOLV_MIDPOINT:
            /* y_{k+1/2} = y_k + h/2 * f(t_k, y_k) */
            let s_half = this.s1;
            this.eulerMethod(s_half, this.s1, this.s1dot, (g_timeStep * 0.001) / 2);
            this.applyForces(s_half, this.forceList);  // find current net force on each particle
            let s_halfDot = new Float32Array(this.partCount * PART_MAXVAR);
            this.dotFinder(s_halfDot, s_half);
            /* y_{k+1} = y_k + h * f(t_{k+1/2}, y_{k+1/2}) */
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                this.s2[j + PART_XPOS] += s_halfDot[j + PART_XPOS] * (g_timeStep * 0.001);
                this.s2[j + PART_YPOS] += s_halfDot[j + PART_YPOS] * (g_timeStep * 0.001);
                this.s2[j + PART_ZPOS] += s_halfDot[j + PART_ZPOS] * (g_timeStep * 0.001);
                this.s2[j + PART_XVEL] += s_halfDot[j + PART_XVEL] * (g_timeStep * 0.001);
                this.s2[j + PART_YVEL] += s_halfDot[j + PART_YVEL] * (g_timeStep * 0.001);
                this.s2[j + PART_ZVEL] += s_halfDot[j + PART_ZVEL] * (g_timeStep * 0.001);
            }
            break;
        case SOLV_ADAMS_BASH:
            /*
            https://en.wikipedia.org/wiki/Linear_multistep_method
            y_{n+2} = y_{n+1} + 3/2*h*f(t_{n+1},y_{n+1}) - 1/2 * h * f(t_n, y_n)
            s1(n), s_mid(n+1) [computed by Euler], s2(n+2)
            */
            let s_mid = this.s1;
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                s_mid[j + PART_XPOS] += this.s1dot[j + PART_XPOS] * (g_timeStep * 0.001);
                s_mid[j + PART_YPOS] += this.s1dot[j + PART_YPOS] * (g_timeStep * 0.001);
                s_mid[j + PART_ZPOS] += this.s1dot[j + PART_ZPOS] * (g_timeStep * 0.001);
                s_mid[j + PART_XVEL] += this.s1dot[j + PART_XVEL] * (g_timeStep * 0.001);
                s_mid[j + PART_YVEL] += this.s1dot[j + PART_YVEL] * (g_timeStep * 0.001);
                s_mid[j + PART_ZVEL] += this.s1dot[j + PART_ZVEL] * (g_timeStep * 0.001);
            }
            this.applyForces(s_mid, this.forceList);  // find current net force on each particle
            let s_midDot = new Float32Array(this.partCount * PART_MAXVAR);
            this.dotFinder(s_midDot, s_mid);
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                this.s2[j + PART_XPOS] = s_mid[j + PART_XPOS]
                    + 3 / 2 * (g_timeStep * 0.001) * s_midDot[j + PART_XPOS]
                    - 1 / 2 * (g_timeStep * 0.001) * this.s1dot[j + PART_XPOS];
                this.s2[j + PART_YPOS] = s_mid[j + PART_YPOS]
                    + 3 / 2 * (g_timeStep * 0.001) * s_midDot[j + PART_YPOS]
                    - 1 / 2 * (g_timeStep * 0.001) * this.s1dot[j + PART_YPOS];
                this.s2[j + PART_ZPOS] = s_mid[j + PART_ZPOS]
                    + 3 / 2 * (g_timeStep * 0.001) * s_midDot[j + PART_ZPOS]
                    - 1 / 2 * (g_timeStep * 0.001) * this.s1dot[j + PART_ZPOS];
                this.s2[j + PART_XVEL] = s_mid[j + PART_XVEL]
                    + 3 / 2 * (g_timeStep * 0.001) * s_midDot[j + PART_XVEL]
                    - 1 / 2 * (g_timeStep * 0.001) * this.s1dot[j + PART_XVEL];
                this.s2[j + PART_YVEL] = s_mid[j + PART_YVEL]
                    + 3 / 2 * (g_timeStep * 0.001) * s_midDot[j + PART_YVEL]
                    - 1 / 2 * (g_timeStep * 0.001) * this.s1dot[j + PART_YVEL];
                this.s2[j + PART_ZVEL] = s_mid[j + PART_ZVEL]
                    + 3 / 2 * (g_timeStep * 0.001) * s_midDot[j + PART_ZVEL]
                    - 1 / 2 * (g_timeStep * 0.001) * this.s1dot[j + PART_ZVEL];
            }
            break;
        case SOLV_RUNGEKUTTA:
            /* 4th order
            ref: Greenbaum, Numerical Methods Design Analysis(Page 300, equation 11.22)
            */
            // * q2 = F(x(i)+0.5*h, y(i)+0.5*h*q1); 
            let s_half1 = this.s1;
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                s_half1[j + PART_XPOS] += 0.5 * (g_timeStep * 0.001) * this.s1dot[j + PART_XPOS];
                s_half1[j + PART_YPOS] += 0.5 * (g_timeStep * 0.001) * this.s1dot[j + PART_YPOS];
                s_half1[j + PART_ZPOS] += 0.5 * (g_timeStep * 0.001) * this.s1dot[j + PART_ZPOS];
                s_half1[j + PART_XVEL] += 0.5 * (g_timeStep * 0.001) * this.s1dot[j + PART_XVEL];
                s_half1[j + PART_YVEL] += 0.5 * (g_timeStep * 0.001) * this.s1dot[j + PART_YVEL];
                s_half1[j + PART_ZVEL] += 0.5 * (g_timeStep * 0.001) * this.s1dot[j + PART_ZVEL];
            }
            this.applyForces(s_half1, this.forceList);  // find y'
            let s_half1Dot = new Float32Array(this.partCount * PART_MAXVAR);
            this.dotFinder(s_half1Dot, s_half1); //find f
            // * q3 = F(x(i)+0.5*h, y(i)+0.5*h*q2); 
            let s_half2 = this.s1;
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                s_half2[j + PART_XPOS] += 0.5 * (g_timeStep * 0.001) * s_half1Dot[j + PART_XPOS];
                s_half2[j + PART_YPOS] += 0.5 * (g_timeStep * 0.001) * s_half1Dot[j + PART_YPOS];
                s_half2[j + PART_ZPOS] += 0.5 * (g_timeStep * 0.001) * s_half1Dot[j + PART_ZPOS];
                s_half2[j + PART_XVEL] += 0.5 * (g_timeStep * 0.001) * s_half1Dot[j + PART_XVEL];
                s_half2[j + PART_YVEL] += 0.5 * (g_timeStep * 0.001) * s_half1Dot[j + PART_YVEL];
                s_half2[j + PART_ZVEL] += 0.5 * (g_timeStep * 0.001) * s_half1Dot[j + PART_ZVEL];
            }
            this.applyForces(s_half2, this.forceList);  // find y'
            let s_half2Dot = new Float32Array(this.partCount * PART_MAXVAR);
            this.dotFinder(s_half2Dot, s_half2); //find f
            // * q4 = F(x(i)+h, y(i)+h*q3); 
            let s_half3 = this.s1;
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                s_half3[j + PART_XPOS] += (g_timeStep * 0.001) * s_half2Dot[j + PART_XPOS];;
                s_half3[j + PART_YPOS] += (g_timeStep * 0.001) * s_half2Dot[j + PART_YPOS];;
                s_half3[j + PART_ZPOS] += (g_timeStep * 0.001) * s_half2Dot[j + PART_ZPOS];;
                s_half3[j + PART_XVEL] += (g_timeStep * 0.001) * s_half2Dot[j + PART_XVEL];
                s_half3[j + PART_YVEL] += (g_timeStep * 0.001) * s_half2Dot[j + PART_YVEL];
                s_half3[j + PART_ZVEL] += (g_timeStep * 0.001) * s_half2Dot[j + PART_ZVEL];
            }
            this.applyForces(s_half3, this.forceList);  // find y'
            let s_half3Dot = new Float32Array(this.partCount * PART_MAXVAR);
            this.dotFinder(s_half3Dot, s_half3); //find f
            // * y2 = y1 + h/6*[q1 + 2q2 + 2q3 + q4]
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                this.s2[j + PART_XPOS] = this.s1[j + PART_XPOS] + (g_timeStep * 0.001) / 6
                    * (this.s1dot[j + PART_XPOS] + 2 * s_half1Dot[j + PART_XPOS] + 2 * s_half2Dot[j + PART_XPOS] + s_half3Dot[j + PART_XPOS]);
                this.s2[j + PART_YPOS] = this.s1[j + PART_YPOS] + (g_timeStep * 0.001) / 6
                    * (this.s1dot[j + PART_YPOS] + 2 * s_half1Dot[j + PART_YPOS] + 2 * s_half2Dot[j + PART_YPOS] + s_half3Dot[j + PART_YPOS]);
                this.s2[j + PART_ZPOS] = this.s1[j + PART_ZPOS] + (g_timeStep * 0.001) / 6
                    * (this.s1dot[j + PART_ZPOS] + 2 * s_half1Dot[j + PART_ZPOS] + 2 * s_half2Dot[j + PART_ZPOS] + s_half3Dot[j + PART_ZPOS]);

                this.s2[j + PART_XVEL] = this.s1[j + PART_XVEL] + (g_timeStep * 0.001) / 6
                    * (this.s1dot[j + PART_XVEL] + 2 * s_half1Dot[j + PART_XVEL] + 2 * s_half2Dot[j + PART_XVEL] + s_half3Dot[j + PART_XVEL]);
                this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL] + (g_timeStep * 0.001) / 6
                    * (this.s1dot[j + PART_YVEL] + 2 * s_half1Dot[j + PART_YVEL] + 2 * s_half2Dot[j + PART_YVEL] + s_half3Dot[j + PART_YVEL]);
                this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL] + (g_timeStep * 0.001) / 6
                    * (this.s1dot[j + PART_ZVEL] + 2 * s_half1Dot[j + PART_ZVEL] + 2 * s_half2Dot[j + PART_ZVEL] + s_half3Dot[j + PART_ZVEL]);
            }
            break;
        // case SOLV_OLDGOOD: // IMPLICIT or 'reverse time' solver inverse euler
        //     var j = 0;
        //     for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        //         this.s2[j + PART_YVEL] -= this.grav * (g_timeStep * 0.001);
        //         this.s2[j + PART_XVEL] *= this.drag;
        //         this.s2[j + PART_YVEL] *= this.drag;
        //         this.s2[j + PART_ZVEL] *= this.drag;
        //         this.s2[j + PART_XPOS] += this.s2[j + PART_XVEL] * (g_timeStep * 0.001);
        //         this.s2[j + PART_YPOS] += this.s2[j + PART_YVEL] * (g_timeStep * 0.001);
        //         this.s2[j + PART_ZPOS] += this.s2[j + PART_ZVEL] * (g_timeStep * 0.001);
        //     }
        //     break;
        case SOLV_BACK_EULER:
            /* 
            https://en.wikipedia.org/wiki/Backward_Euler_method
            solve an algebraic equation for the unknown y_{k+1}
            w'=w(i)+h*f(t(i),w(i));
            w(i+1)=w(i)+h*f(t(i+1),w');
            */
            this.eulerMethod(this.s2, this.s1, this.s1dot, (g_timeStep * 0.001));
            this.applyForces(this.s2, this.forceList);
            let s2dotBE = new Float32Array(this.partCount * PART_MAXVAR);
            this.dotFinder(s2dotBE, this.s2);
            let s3 = new Float32Array(this.partCount * PART_MAXVAR);

            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                //* s1 ~ s2 -h*s2dot
                s3[j + PART_XPOS] = this.s2[j + PART_XPOS] - s2dotBE[j + PART_XPOS] * (g_timeStep * 0.001);
                s3[j + PART_YPOS] = this.s2[j + PART_YPOS] - s2dotBE[j + PART_YPOS] * (g_timeStep * 0.001);
                s3[j + PART_ZPOS] = this.s2[j + PART_ZPOS] - s2dotBE[j + PART_ZPOS] * (g_timeStep * 0.001);
                s3[j + PART_XVEL] = this.s2[j + PART_XVEL] - s2dotBE[j + PART_XVEL] * (g_timeStep * 0.001);
                s3[j + PART_YVEL] = this.s2[j + PART_YVEL] - s2dotBE[j + PART_YVEL] * (g_timeStep * 0.001);
                s3[j + PART_ZVEL] = this.s2[j + PART_ZVEL] - s2dotBE[j + PART_ZVEL] * (g_timeStep * 0.001);
            }
            let sErr = new Float32Array(this.partCount * PART_MAXVAR);
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                //Find residue sErr
                sErr[j + PART_XPOS] = (this.s1[j + PART_XPOS] - s3[j + PART_XPOS]);
                sErr[j + PART_YPOS] = (this.s1[j + PART_YPOS] - s3[j + PART_YPOS]);
                sErr[j + PART_ZPOS] = (this.s1[j + PART_ZPOS] - s3[j + PART_ZPOS]);
                sErr[j + PART_XVEL] = (this.s1[j + PART_XVEL] - s3[j + PART_XVEL]);
                sErr[j + PART_YVEL] = (this.s1[j + PART_YVEL] - s3[j + PART_YVEL]);
                sErr[j + PART_ZVEL] = (this.s1[j + PART_ZVEL] - s3[j + PART_ZVEL]);
                //Correct half the error:
                this.s2[j + PART_XPOS] += sErr[j + PART_XPOS] * 0.5;
                this.s2[j + PART_YPOS] += sErr[j + PART_YPOS] * 0.5;
                this.s2[j + PART_ZPOS] += sErr[j + PART_ZPOS] * 0.5;
                this.s2[j + PART_XVEL] += sErr[j + PART_XVEL] * 0.5;
                this.s2[j + PART_YVEL] += sErr[j + PART_YVEL] * 0.5;
                this.s2[j + PART_ZVEL] += sErr[j + PART_ZVEL] * 0.5;
            }
            // console.log(this.s2);
            break;

        case SOLV_VEL_VERLET:
            // s2.pos = s1.pos + s1.vel*h + s1.acc*(h^2/2);
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                this.s2[j + PART_XPOS] = this.s1[j + PART_XPOS] + this.s1[j + PART_XVEL] * (g_timeStep * 0.001)
                    + this.s1dot[j + PART_XVEL] * Math.pow(g_timeStep * 0.001, 2) / 2;
                this.s2[j + PART_YPOS] = this.s1[j + PART_YPOS] + this.s1[j + PART_YVEL] * (g_timeStep * 0.001)
                    + this.s1dot[j + PART_YVEL] * Math.pow(g_timeStep * 0.001, 2) / 2;
                this.s2[j + PART_ZPOS] = this.s1[j + PART_ZPOS] + this.s1[j + PART_ZVEL] * (g_timeStep * 0.001)
                    + this.s1dot[j + PART_ZVEL] * Math.pow(g_timeStep * 0.001, 2) / 2;
            }
            // applyallforces(s2) to find s2''
            this.applyForces(this.s2, this.forceList);
            let s2dot = new Float32Array(this.partCount * PART_MAXVAR);
            this.dotFinder(s2dot, this.s2)
            // estimate s2.vel from average of s1and s2 accelerations
            // s2.vel = s1.vel + (s2.acc + s1.acc)*(h/2)
            var j = 0;
            for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                this.s2[j + PART_XVEL] = this.s1[j + PART_XVEL] + (s2dot[j + PART_XVEL] + this.s1dot[j + PART_XVEL]) * g_timeStep * 0.001 / 2;
                this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL] + (s2dot[j + PART_YVEL] + this.s1dot[j + PART_YVEL]) * g_timeStep * 0.001 / 2;
                this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL] + (s2dot[j + PART_ZVEL] + this.s1dot[j + PART_ZVEL]) * g_timeStep * 0.001 / 2;
            }
            break;
        default:
            console.log('?!?! unknown solver: g_partA.solvType==' + this.solvType);
            break;
    }
    return;
}

PartSys.prototype.eulerMethod = function (s2, s1, s1dot, h) {
    /* a way calculate the next step to start*/
    var j = 0;
    for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
        s2[j + PART_XPOS] = s1[j + PART_XPOS] + s1dot[j + PART_XPOS] * h;
        s2[j + PART_YPOS] = s1[j + PART_YPOS] + s1dot[j + PART_YPOS] * h;
        s2[j + PART_ZPOS] = s1[j + PART_ZPOS] + s1dot[j + PART_ZPOS] * h;
        s2[j + PART_XVEL] = s1[j + PART_XVEL] + s1dot[j + PART_XVEL] * h;
        s2[j + PART_YVEL] = s1[j + PART_YVEL] + s1dot[j + PART_YVEL] * h;
        s2[j + PART_ZVEL] = s1[j + PART_ZVEL] + s1dot[j + PART_ZVEL] * h;
    }
    return s2;
}


function findCentroid(s) {
    /*
    @param: a long list of state variables
    @return the xyz position of its centroid
    */
    var j = 0;
    let centroid = new Float32Array(3);
    let partCount = s.length / PART_MAXVAR;
    for (var i = 0; i < partCount; i += 1, j += PART_MAXVAR) {
        centroid[0] += s[j + PART_XPOS];
        centroid[1] += s[j + PART_YPOS];
        centroid[2] += s[j + PART_ZPOS];
    }
    return [centroid[0] / partCount, centroid[1] / partCount, centroid[2] / partCount];
}

function findCentroidIdxBased(s, IdxArray) {
    /*
   @param: a long list of state variables, idx
   @return the xyz position of its centroid
   */
    var j = 0;
    let centroid = new Float32Array(3);
    let partCount = s.length / PART_MAXVAR;
    for (var i = 0; i < partCount; i += 1, j += PART_MAXVAR) {
        if (IdxArray.includes(i)) {
            centroid[0] += s[j + PART_XPOS];
            centroid[1] += s[j + PART_YPOS];
            centroid[2] += s[j + PART_ZPOS];
        }
    }
    return [centroid[0] / partCount, centroid[1] / partCount, centroid[2] / partCount];
}

function maxDirection(x, y, z) {
    if (x > y && x > z) {
        return [1, 0, 0];
    }
    else if (y > x && y > z) {
        return [0, 1, 0];
    }
    else {
        return [0, 0, 1];
    }
}

function isReachFloor(floorstate, neighbors) {
    let reachFloor = false;
    for (let n = 0; n < neighbors.length; n++) {
        if (floorstate[neighbors[n]] != -1) {
            return reachFloor;
        }
    }
    return reachFloor;
}

PartSys.prototype.doConstraints = function () {
    /*
    accepts state variables s1 and s2 
    an array of constraint-applying objects.  
    This function applies constraints to all changes between s1 and s2, and modifies s2 so that the result meets all the constraints.  
    */
    let BOID_RAD = params.BoidBoundarySize;
    let BOID_BOUNCE = 1.0;
    let BOUNCE_STEP = 0.001;
    for (var l = 0; l < this.limitList.length; l++) {
        let curLim = this.limitList[l];
        switch (curLim.limitType) {
            case LIM_FLOOR:
                const FLOORPOS = -0.5;
                for (let i = 0; i < this.partCount; i++) {
                    //floor constraint
                    if (this.s2[i * PART_MAXVAR + PART_YPOS] < FLOORPOS || this.s2[i * PART_MAXVAR + PART_YPOS] < this.accumulated[i] + FLOORPOS) {
                        this.floorstate[i] = 0;
                        // console.log(i, this.accumulated[i])
                        this.s2[i * PART_MAXVAR + PART_YPOS] = this.accumulated[i] + FLOORPOS;
                        this.s2[i * PART_MAXVAR + PART_XVEL] = 0;
                        this.s2[i * PART_MAXVAR + PART_YVEL] = 0;
                        this.s2[i * PART_MAXVAR + PART_ZVEL] = 0;
                        this.s2[i * PART_MAXVAR + PART_X_FTOT] = 0;
                        this.s2[i * PART_MAXVAR + PART_Y_FTOT] = 0;
                        this.s2[i * PART_MAXVAR + PART_Z_FTOT] = 0;
                    }
                }
                break;
            case LIM_COLLISION:
                const PARTICLE_RAD = 0.04;
                //neighbors pile up
                let maxCount = Math.log(this.partCount) * 3;
                if (Math.min.apply(Math, this.floorstate) != 0) { //there exist -1 in the floorstate
                    for (let i = 0; i < this.partCount; i++) {
                        let steps1 = 0;
                        let steps2 = 0;
                        let neighbors = findNeighbors(this.s2, i, PARTICLE_RAD);
                        // console.log(this.floorstate)
                        if (neighbors.length > 0) {
                            let neighborCenter = findCentroidIdxBased(this.s2, neighbors);
                            let dx = this.s2[i * PART_MAXVAR + PART_XPOS] - neighborCenter[0];
                            let dy = this.s2[i * PART_MAXVAR + PART_YPOS] - neighborCenter[1];
                            let dz = this.s2[i * PART_MAXVAR + PART_ZPOS] - neighborCenter[2];
                            // let dir = maxDirection(dx, dy, dz);
                            // while (neighbors.length > 0 && steps1 < maxCount && !isReachFloor(this.floorstate, neighbors)) {
                            //     this.s2[i * PART_MAXVAR + PART_YPOS] += PARTICLE_RAD;
                            //     neighbors = findNeighbors(this.s2, i, PARTICLE_RAD);
                            //     steps1++;
                            // }
                            // let tmp = this.s2.map(a => ({...a}));
                            while (neighbors.length > 0 && steps2 < maxCount
                                && (isReachFloor(this.floorstate, neighbors) || this.s2[i * PART_MAXVAR + PART_YPOS] < maxCount / 3 * PARTICLE_RAD)) {
                                steps2++;
                                this.s2[i * PART_MAXVAR + PART_YPOS] += PARTICLE_RAD;
                                neighbors = findNeighbors(this.s2, i, PARTICLE_RAD);
                                this.accumulated[i] = steps2 * PARTICLE_RAD * 0.5;
                            }
                            // this.s2[i * PART_MAXVAR + PART_YPOS] = tmp.map(a => ({...a}));
                            // this.s2[i*PART_MAXVAR + PART_ZVEL] += 1*dz;
                            // this.s2[i*PART_MAXVAR + PART_XVEL] += 1*dx;
                            // this.s2[i * PART_MAXVAR + PART_XVEL] += 1 * dx;
                            // this.s2[i * PART_MAXVAR + PART_YVEL] += 0.4 * dy;
                            // this.s2[i * PART_MAXVAR + PART_ZVEL] += 1 * dz;
                            // neighbors = findNeighbors(this.s2, i, PARTICLE_RAD);
                            // console.log(neighbors)

                        } else if (isReachFloor(this.floorstate, neighbors)) {
                            this.floorstate[i] = 0;
                        }
                    }
                }
                break;
            case LIM_CYLINDER:
                for (let i = 0; i < this.partCount; i++) {
                    //cylinder wall constraint
                    if (Math.sqrt(Math.pow(this.s2[i * PART_MAXVAR + PART_XPOS], 2) + Math.pow(this.s2[i * PART_MAXVAR + PART_ZPOS], 2)) >= this.CYLINDAR_RAD) {
                        this.s2[i * PART_MAXVAR + PART_XVEL] = 0;
                        this.s2[i * PART_MAXVAR + PART_ZVEL] = 0;
                        this.s2[i * PART_MAXVAR + PART_XPOS] = this.s1[i * PART_MAXVAR + PART_XPOS];
                        this.s2[i * PART_MAXVAR + PART_ZPOS] = this.s1[i * PART_MAXVAR + PART_ZPOS];
                        this.s2[i * PART_MAXVAR + PART_X_FTOT] = 0;
                        this.s2[i * PART_MAXVAR + PART_Z_FTOT] = 0;
                    }
                }
                break;
            case LIM_FIXEDPT: //fix two point of a cloth
                let fixedIdxArray = [0, this.clothWidth - 1]; //range from 0 to this.partCount-1
                for (let i = 0; i < fixedIdxArray.length; i++) {
                    this.s2[fixedIdxArray[i] * PART_MAXVAR + PART_XPOS] = fixedIdxArray[i] % this.clothWidth * this.spacing;
                    this.s2[fixedIdxArray[i] * PART_MAXVAR + PART_YPOS] = -1 * Math.floor(fixedIdxArray[i] / this.clothWidth) * this.spacing;
                    this.s2[fixedIdxArray[i] * PART_MAXVAR + PART_ZPOS] = 0.0;
                    this.s2[fixedIdxArray[i] * PART_MAXVAR + PART_R] = 0.7;
                    this.s2[fixedIdxArray[i] * PART_MAXVAR + PART_G] = 0.4;
                    this.s2[fixedIdxArray[i] * PART_MAXVAR + PART_B] = 0.0;
                }
                break;
            case LIM_ANCHOR: // Keep specified particle(s) at world-space location
                var j = 0;
                // let centroid = findCentroid(this.s2);
                for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                    let dist = eucDistIndv(0, 0, 0,
                        this.s2[j + PART_XPOS], this.s2[j + PART_YPOS], this.s2[j + PART_ZPOS]);
                    if (dist >= BOID_RAD) {
                        let vec1 = [this.s2[j + PART_XPOS], this.s2[j + PART_YPOS], this.s2[j + PART_ZPOS]];
                        let vec2 = [this.s2[j + PART_XVEL], this.s2[j + PART_YVEL], this.s2[j + PART_ZVEL]];
                        let crossProd = crossProduct3d(vec1, vec2);
                        // this.s2[j + PART_XPOS] += (this.s2[j + PART_XPOS] < 0) ? 1 : -1 * BOUNCE_STEP; //FIXME: map to the surface of the sphere
                        // this.s2[j + PART_YPOS] += (this.s2[j + PART_YPOS] < 0) ? 1 : -1 * BOUNCE_STEP;
                        // this.s2[j + PART_ZPOS] += (this.s2[j + PART_ZPOS] < 0) ? 1 : -1 * BOUNCE_STEP;

                        //normalize the positions of each point reached boundary
                        this.s2[j + PART_XPOS] = this.s2[j + PART_XPOS] * Math.max(BOID_RAD / dist, 0.5);
                        this.s2[j + PART_YPOS] = this.s2[j + PART_YPOS] * Math.max(BOID_RAD / dist, 0.5);
                        this.s2[j + PART_ZPOS] = this.s2[j + PART_ZPOS] * Math.max(BOID_RAD / dist, 0.5);
                        let dir = flyingDir([this.s2[j + PART_XPOS], this.s2[j + PART_YPOS], this.s2[j + PART_ZPOS]], [0, 0, 0], 0.3);

                        if (!isBounceBoid) {
                            this.s2[j + PART_XVEL] = dir[0] > 0 ? 1 + dir[0] : -1 + dir[0];
                            this.s2[j + PART_YVEL] = dir[1] > 0 ? 1 + dir[1] : -1 + dir[1];
                            this.s2[j + PART_ZVEL] = dir[2] > 0 ? 1 + dir[2] : -1 + dir[2];
                            this.s2[j + PART_XVEL] += -this.s2[j + PART_XPOS] * params.BoidEvasion;
                            this.s2[j + PART_YVEL] += -this.s2[j + PART_YPOS] * params.BoidEvasion;
                            this.s2[j + PART_ZVEL] += -this.s2[j + PART_ZPOS] * params.BoidEvasion;
                        }
                        else {
                            this.s2[j + PART_XVEL] = -Math.max(params.BoidEvasion, 1) * crossProd[0];
                            this.s2[j + PART_YVEL] = -Math.max(params.BoidEvasion, 1) * crossProd[1];
                            this.s2[j + PART_ZVEL] = -Math.max(params.BoidEvasion, 1) * crossProd[2];
                            this.s2[j + PART_XVEL] += -this.s2[j + PART_XPOS] * params.BoidEvasion * 0.6;
                            this.s2[j + PART_YVEL] += -this.s2[j + PART_YPOS] * params.BoidEvasion * 0.6;
                            this.s2[j + PART_ZVEL] += -this.s2[j + PART_ZPOS] * params.BoidEvasion * 0.6;
                        }



                    }
                }
                break;
            case CONS_FIRE:
                var j = 0;  // i==particle number; j==array index for i-th particle
                for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                    this.s2[j + PART_AGE] -= 1;     // decrement lifetime.
                    let dx = 0;
                    let dy = 0;
                    if(g_isDrag){
                        dx = g_xMdragTot;
                        dy = g_yMdragTot;
                    }
                    if (this.s2[j + PART_AGE] <= 0) { // End of life: RESET this particle!
                        this.roundRand();
                        this.s2[j + PART_XPOS] = -0.0 + 0.1 * this.randX;
                        this.s2[j + PART_YPOS] = -1.0;
                        this.s2[j + PART_ZPOS] = -0.0 + 0.1 * this.randZ;
                        this.s2[j + PART_WPOS] = 1.0;
                        this.roundRand();
                        this.s2[j + PART_XVEL] = this.INIT_VEL * (0.0 + 0.05 * this.randX + 0.5*dx);
                        this.s2[j + PART_YVEL] = this.INIT_VEL * (0.3 + 0.3 * this.randY + 0.5*dy);
                        this.s2[j + PART_ZVEL] = this.INIT_VEL * (0.0 + 0.05 * this.randZ);
                        this.s2[j + PART_MASS] = 1.0;      // mass, in kg.
                        this.s2[j + PART_DIAM] = 40 * Math.random(); // on-screen diameter, in pixels
                        this.s2[j + PART_RENDMODE] = 0.0;
                        this.s2[j + PART_AGE] = 10 + 100 * Math.random();
                    } // if age <=0
                }
            case CONS_BOUNCYBALL0:
                var j = 0;  // i==particle number; j==array index for i-th particle
                for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                    // simple velocity-reversal: 
                    if (this.s2[j + PART_XPOS] < -0.9 && this.s2[j + PART_XVEL] < 0.0) {
                        // bounce on left (-X) wall
                        this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL];
                    }
                    else if (this.s2[j + PART_XPOS] > 0.9 && this.s2[j + PART_XVEL] > 0.0) {
                        // bounce on right (+X) wall
                        this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL];
                    } //---------------------------
                    if (this.s2[j + PART_YPOS] < -0.9 && this.s2[j + PART_YVEL] < 0.0) {
                        // bounce on floor (-Y)
                        this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL];
                    }
                    else if (this.s2[j + PART_YPOS] > 0.9 && this.s2[j + PART_YVEL] > 0.0) {
                        // bounce on ceiling (+Y)
                        this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL];
                    } //---------------------------
                    if (this.s2[j + PART_ZPOS] < -0.9 && this.s2[j + PART_ZVEL] < 0.0) {
                        // bounce on near wall (-Z)
                        this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL];
                    }
                    else if (this.s2[j + PART_ZPOS] > 0.9 && this.s2[j + PART_ZVEL] > 0.0) {
                        // bounce on far wall (+Z)
                        this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL];
                    }
                    //--------------------------
                    // The above constraints change ONLY the velocity; nothing explicitly
                    // forces the bouncy-ball to stay within the walls. If we begin with a
                    // bouncy-ball on floor with zero velocity, gravity will cause it to 'fall' 
                    // through the floor during the next timestep.  At the end of that timestep
                    // our velocity-only constraint will scale velocity by -this.resti, but its
                    // position is still below the floor!  Worse, the resti-weakened upward 
                    // velocity will get cancelled by the new downward velocity added by gravity 
                    // during the NEXT time-step. This gives the ball a net downwards velocity 
                    // again, which again gets multiplied by -this.resti to make a slight upwards
                    // velocity, but with the ball even further below the floor. As this cycle
                    // repeats, the ball slowly sinks further and further downwards.
                    // THUS the floor needs this position-enforcing constraint as well:
                    if (this.s2[j + PART_YPOS] < -0.9) this.s2[j + PART_YPOS] = -0.9;
                    else if (this.s2[j + PART_YPOS] > 0.9) this.s2[j + PART_YPOS] = 0.9; // ceiling
                    if (this.s2[j + PART_XPOS] < -0.9) this.s2[j + PART_XPOS] = -0.9; // left wall
                    else if (this.s2[j + PART_XPOS] > 0.9) this.s2[j + PART_XPOS] = 0.9; // right wall
                    if (this.s2[j + PART_ZPOS] < -0.9) this.s2[j + PART_ZPOS] = -0.9; // near wall
                    else if (this.s2[j + PART_ZPOS] > 0.9) this.s2[j + PART_ZPOS] = 0.9; // far wall
                    // Our simple 'bouncy-ball' particle system needs this position-limiting
                    // constraint ONLY for the floor and not the walls, as no forces exist that
                    // could 'push' a zero-velocity particle against the wall. But suppose we
                    // have a 'blowing wind' force that pushes particles left or right? Any
                    // particle that comes to rest against our left or right wall could be
                    // slowly 'pushed' through that wall as well -- THUS we need position-limiting
                    // constraints for ALL the walls:
                } // end of for-loop thru all particles
                break;
            case CONS_BOUNCYBALL1:
                var j = 0;  // i==particle number; j==array index for i-th particle
                for (var i = 0; i < this.partCount; i += 1, j += PART_MAXVAR) {
                    //--------  left (-X) wall  ----------
                    if (this.s2[j + PART_XPOS] < -0.9) {// && this.s2[j + PART_XVEL] < 0.0 ) {
                        // collision!
                        this.s2[j + PART_XPOS] = -0.9;// 1) resolve contact: put particle at wall.
                        this.s2[j + PART_XVEL] = this.s1[j + PART_XVEL];  // 2a) undo velocity change:
                        this.s2[j + PART_XVEL] *= this.drag;	            // 2b) apply drag:
                        // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
                        // ATTENTION! VERY SUBTLE PROBLEM HERE!
                        // need a velocity-sign test here that ensures the 'bounce' step will 
                        // always send the ball outwards, away from its wall or floor collision. 
                        if (this.s2[j + PART_XVEL] < 0.0)
                            this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL]; // need sign change--bounce!
                        else
                            this.s2[j + PART_XVEL] = this.resti * this.s2[j + PART_XVEL]; // sign changed-- don't need another.
                    }
                    //--------  right (+X) wall  --------------------------------------------
                    else if (this.s2[j + PART_XPOS] > 0.9) { // && this.s2[j + PART_XVEL] > 0.0) {	
                        // collision!
                        this.s2[j + PART_XPOS] = 0.9; // 1) resolve contact: put particle at wall.
                        this.s2[j + PART_XVEL] = this.s1[j + PART_XVEL];	// 2a) undo velocity change:
                        this.s2[j + PART_XVEL] *= this.drag;			        // 2b) apply drag:
                        // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
                        // ATTENTION! VERY SUBTLE PROBLEM HERE! 
                        // need a velocity-sign test here that ensures the 'bounce' step will 
                        // always send the ball outwards, away from its wall or floor collision. 
                        if (this.s2[j + PART_XVEL] > 0.0)
                            this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL]; // need sign change--bounce!
                        else
                            this.s2[j + PART_XVEL] = this.resti * this.s2[j + PART_XVEL];	// sign changed-- don't need another.
                    }
                    //--------  floor (-Y) wall  --------------------------------------------  		
                    if (this.s2[j + PART_YPOS] < -0.9) { // && this.s2[j + PART_YVEL] < 0.0) {		
                        // collision! floor...  
                        this.s2[j + PART_YPOS] = -0.9;// 1) resolve contact: put particle at wall.
                        this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL];	// 2a) undo velocity change:
                        this.s2[j + PART_YVEL] *= this.drag;		          // 2b) apply drag:	
                        // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
                        // ATTENTION! VERY SUBTLE PROBLEM HERE!
                        // need a velocity-sign test here that ensures the 'bounce' step will 
                        // always send the ball outwards, away from its wall or floor collision.
                        if (this.s2[j + PART_YVEL] < 0.0)
                            this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL]; // need sign change--bounce!
                        else
                            this.s2[j + PART_YVEL] = this.resti * this.s2[j + PART_YVEL];	// sign changed-- don't need another.
                    }
                    //--------  ceiling (+Y) wall  ------------------------------------------
                    else if (this.s2[j + PART_YPOS] > 0.9) { // && this.s2[j + PART_YVEL] > 0.0) {
                        // collision! ceiling...
                        this.s2[j + PART_YPOS] = 0.9;// 1) resolve contact: put particle at wall.
                        this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL];	// 2a) undo velocity change:
                        this.s2[j + PART_YVEL] *= this.drag;			        // 2b) apply drag:
                        // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
                        // ATTENTION! VERY SUBTLE PROBLEM HERE!
                        // need a velocity-sign test here that ensures the 'bounce' step will 
                        // always send the ball outwards, away from its wall or floor collision.
                        if (this.s2[j + PART_YVEL] > 0.0)
                            this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL]; // need sign change--bounce!
                        else
                            this.s2[j + PART_YVEL] = this.resti * this.s2[j + PART_YVEL];	// sign changed-- don't need another.
                    }
                    //--------  near (-Z) wall  --------------------------------------------- 
                    if (this.s2[j + PART_ZPOS] < -0.9) { // && this.s2[j + PART_ZVEL] < 0.0 ) {
                        // collision! 
                        this.s2[j + PART_ZPOS] = -0.9;// 1) resolve contact: put particle at wall.
                        this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL];  // 2a) undo velocity change:
                        this.s2[j + PART_ZVEL] *= this.drag;			        // 2b) apply drag:
                        // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
                        // ATTENTION! VERY SUBTLE PROBLEM HERE! ------------------------------
                        // need a velocity-sign test here that ensures the 'bounce' step will 
                        // always send the ball outwards, away from its wall or floor collision. 
                        if (this.s2[j + PART_ZVEL] < 0.0)
                            this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL]; // need sign change--bounce!
                        else
                            this.s2[j + PART_ZVEL] = this.resti * this.s2[j + PART_ZVEL];	// sign changed-- don't need another.
                    }
                    //--------  far (+Z) wall  ---------------------------------------------- 
                    else if (this.s2[j + PART_ZPOS] > 0.9) { // && this.s2[j + PART_ZVEL] > 0.0) {	
                        // collision! 
                        this.s2[j + PART_ZPOS] = 0.9; // 1) resolve contact: put particle at wall.
                        this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL];  // 2a) undo velocity change:
                        this.s2[j + PART_ZVEL] *= this.drag;			        // 2b) apply drag:

                        if (this.s2[j + PART_ZVEL] > 0.0)
                            this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL]; // need sign change--bounce!
                        else
                            this.s2[j + PART_ZVEL] = this.resti * this.s2[j + PART_ZVEL];	// sign changed-- don't need another.
                    } // end of (+Z) wall constraint
                } // end of for-loop for all particles
                break;
            default:
                console.log('?!?! unknown constraint: PartSys.constraintType==' + curLim.limitType);
                break;
        }
    }

}

function crossProduct3d(a, b) { //return normalized cross product vector in 3d
    let cross = [a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]];
    let dist = eucDistIndv(0, 0, 0, cross[0], cross[1], cross[2]);
    return [cross[0] / dist, cross[1] / dist, cross[2] / dist];
}

PartSys.prototype.swap = function () {
    /*
    exchanges the contents of s1 and s2 by swapping their references
    */

    this.s1.set(this.s2);
}


PartSys.prototype.perlinNoise = function () {
    /*
    https://adrianb.io/2014/08/09/perlinnoise.html
    */
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