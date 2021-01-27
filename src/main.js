/*
Jan 24, 2021
References: besides the inline links in index.html, the code is modified from 
    [Textbook] ...
    [Canvas Starter Code] ...
    [Previous projects] ProjectC from 351-1
*/
/*
    Done: display point
    Done: r/R key to start and add velocity to single ball bouncing 
    Done: f/F key to toggle explicit/implicit solvers ('bad'/'good')
    Done: 123 key to change runcode mode & running state
    Done: object oriented
    Done: showing 2 particles
    Done: debug why multiple ball not moving correctly updating&solving sequence not right
    Done: debug buffer overflow for plane, modelMatrix not pushing correctly
    * Almost Done: dotFinder(), s1dot
    * Almost Done: applyAllForces(), 
    TODO: 3D movement
    TODO: impliment other solver
    TODO: add shader to particles

    ! need testing/debugging: 
        scale the dots too, seems that particle points are not scaled when mouse scrolling
        shift+r not appearing, but 
    ! missing: user controls:
        --f/F fountain motion
        --b/B key to change bounce scheme (06)
        --r/R key to ''refresh' or 'Reset' the bouncy ball;
        --p/P key to pause/unpause the bouncy ball;
        --SPACE BAR to single-step the bouncy ball.
        --c/C key to toggle WebGL screen-clearing in draw() fcn. isClear
        --d/D key to adjust drag up or down;
        --g/G key to adjust gravity up or down.
        ! adding all above to on screen instructions
    ! 🐞: draggable blin-phong light direction: mainly black
*/

"use strict"

var canvas;	
var gl;	
var g_viewProjMatrix;
var g_modelMatrix;
var shadingScheme;
var vboArray;

var g_timeStep = 1000.0/60.0;			// current timestep in milliseconds (init to 1/60th sec) 
var g_timeStepMin = g_timeStep;   //holds min,max timestep values since last keypress.
var g_timeStepMax = g_timeStep;

var g_partA;

function initVBOs(currScheme){
    var grid = new VBO_genetic(diffuseVert, diffuseFrag, grid_vertices, grid_colors, grid_normals, null, 0);
    grid.init();
    var plane = new VBO_genetic(currScheme[0], currScheme[1], plane_vertices, plane_colors, plane_normals, plane_indices, currScheme[2]);
    plane.init();
    var sphere = new VBO_genetic(currScheme[0], currScheme[1], sphere_vertices, sphere_colors, sphere_normals, sphere_indices, currScheme[2], 10);
    sphere.init();
    var sphere_test = new VBO_genetic(currScheme[0], currScheme[1], sphere_vertices, sphere_colors, sphere_normals, sphere_indices, currScheme[2]);
    sphere_test.init();

    g_partA = new PartSys();
    g_partA.initShader(particleVert, particleFrag);
    g_partA.initBouncy2D(30);
    
    vboArray = [grid, plane, sphere_test, sphere];
}
function main() {
    console.log("I'm in main.js right now...");
    
    canvas = document.getElementById('webgl');
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    window.addEventListener("mousedown", myMouseDown);
    window.addEventListener("mousemove", myMouseMove);
    window.addEventListener("mouseup", myMouseUp);
    window.addEventListener("wheel", mouseWheel);
    document.onkeydown = function (ev) {
        keyAD(ev);
        keyWS(ev);
        keyQE(ev);
        key123(ev);
        keyArrowRotateRight(ev);
        keyArrowRotateUp(ev);
        materialKeyPress(ev);
    };

    // Set the clear color and enable the depth test
    gl.clearColor(0.15, 0.15, 0.15, 1.0);
    // gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);// Enable alpha blending
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // Set blending function conflict with shadow...?
    g_modelMatrix = new Matrix4(); 

    shadingScheme = { //[plane, cube, cube2, sphere, sphere2, cube3] 
        0:[PhongPhongVert,PhongPhongFrag,5],
        1:[draggableBlinnPhongVert,draggableBlinnPhongFrag,3],
    };

    initVBOs(shadingScheme[0]);    

    var tick = function () {
        canvas.width = window.innerWidth * 1; //resize canvas
        canvas.height = window.innerHeight * 1;

        // ! setting view control
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    // Clear color and depth buffer
        gl.viewport(0, 0, canvas.width, canvas.height);
        g_viewProjMatrix = new Matrix4(); //should be the same for every vbo
        var aspectRatio = (gl.canvas.width) / (gl.canvas.height);
        g_viewProjMatrix.setPerspective(30.0, aspectRatio, 1, 100);
        g_viewProjMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ, g_LookX, g_LookY, g_LookZ, 0, 1, 0); //center/look-at point
        g_viewProjMatrix.scale(0.4 * g_viewScale, 0.4 * g_viewScale, 0.4 * g_viewScale); //scale everything
    

        // ! animation
        currentAngle = animate(currentAngle);
        g_timeStep = animateTimestep(); 
        if(g_timeStep > 200) {   // wait > 0.2 seconds
            g_timeStep = 1000/60;
        }
        if (g_timeStep < g_timeStepMin){
            g_timeStepMin = g_timeStep;  
        } 
        else if(g_timeStep > g_timeStepMax){
            g_timeStepMax = g_timeStep;
        }

        // ! draw
        drawAll(vboArray);
        window.requestAnimationFrame(tick, canvas);

    }
    tick();

}

/* the different shaders details */
var draggableBlinnPhongVert = 
    "struct MatlT {\n" +
    "		vec3 emit;\n" + // Ke: emissive -- surface 'glow' amount (r,g,b);
    "		vec3 ambi;\n" + // Ka: ambient reflectance (r,g,b)
    "		vec3 diff;\n" + // Kd: diffuse reflectance (r,g,b)
    "		vec3 spec;\n" + // Ks: specular reflectance (r,g,b)
    "		int shiny;\n" + // Kshiny: specular exponent (integer >= 1; typ. <200)
    "		};\n" +
    "attribute vec4 a_Position; \n" +
    "attribute vec4 a_Normal; \n" +
    // 	'uniform vec3 u_Kd; \n' +	//reflect entire sphere	 Later: as vertex attrib
    "uniform MatlT u_MatlSet[1];\n" + // Array of all materials.
    "uniform mat4 u_MvpMatrix; \n" +
    "uniform mat4 u_ModelMatrix; \n" +
    "uniform mat4 u_NormalMatrix; \n" +

    //-------------VARYING:Vertex Shader values sent per-pixel to Fragment shader:
    "varying vec3 v_Kd; \n" + // Phong Lighting: diffuse reflectance
    "varying vec4 v_Position; \n" +
    "varying vec3 v_Normal; \n" + // Why Vec3? its not a point, hence w==0

    "void main() { \n" +
    "  gl_Position = u_MvpMatrix * a_Position;\n" +
    "  v_Position = u_ModelMatrix * a_Position; \n" +
    "  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n" +
    "  v_Kd = u_MatlSet[0].diff; \n" + // find per-pixel diffuse reflectance from per-vertex
    "}\n";

var draggableBlinnPhongFrag =  // ! TODO: add second head light
    'precision highp float;\n' +
    'precision highp int;\n' +
  
    //--------------- GLSL Struct Definitions:
    'struct LampT {\n' +		// Describes one point-like Phong light source
    '	vec3 pos;\n' +			// (x,y,z,w); w==1.0 for local light at x,y,z position
    ' 	vec3 ambi;\n' +			// Ia ==  ambient light source strength (r,g,b)
    ' 	vec3 diff;\n' +			// Id ==  diffuse light source strength (r,g,b)
    '	vec3 spec;\n' +			// Is == specular light source strength (r,g,b)
    '}; \n' +

    'struct MatlT {\n' +		// Describes one Phong material by its reflectances:
    '		vec3 emit;\n' +			// Ke: emissive -- surface 'glow' amount (r,g,b);
    '		vec3 ambi;\n' +			// Ka: ambient reflectance (r,g,b)
    '		vec3 diff;\n' +			// Kd: diffuse reflectance (r,g,b)
    '		vec3 spec;\n' + 		// Ks: specular reflectance (r,g,b)
    '		int shiny;\n' +			// Kshiny: specular exponent (integer >= 1; typ. <200)
    '		};\n' +

    //-------------UNIFORMS: values set from JavaScript before a drawing command.
    'uniform LampT u_LampSet[2];\n' +		// Array of all light sources.
    'uniform MatlT u_MatlSet[1];\n' +		// Array of all materials.
    'uniform vec3 u_eyePosWorld; \n' + 	// Camera/eye location in world coords.

    //-------------VARYING:Vertex Shader values sent per-pixel to Fragment shader: 
    'varying vec3 v_Normal;\n' +			// Find 3D surface normal at each pix
    'varying vec4 v_Position;\n' +			// pixel's 3D pos too -- in 'world' coords
    'varying vec3 v_Kd;	\n' +			    // Find diffuse reflectance K_d per pix

    'void main() { \n' +
    '  vec3 normal = normalize(v_Normal); \n' +
    '  vec3 eyeDirection = normalize(u_eyePosWorld - v_Position.xyz); \n' +

    // Light Source 1
    '  vec3 lightDirection = normalize(u_LampSet[0].pos - v_Position.xyz);\n' +
    '  float nDotL = max(dot(lightDirection, normal), 0.0); \n' +
    // ? vvvvvvvvvvvvvvvvvvvvvvvv
    '  vec3 H = normalize(lightDirection + eyeDirection); \n' +
    '  float nDotH = max(dot(H, normal), 0.0); \n' +
    '  float e64 = pow(nDotH, float(u_MatlSet[0].shiny));\n' + // pow() won't accept integer exponents! Convert K_shiny!  
    // ? ^^^^^^^^^^^^^^^^^^^^^^^^
    '  vec3 emissive = u_MatlSet[0].emit;' +
    '  vec3 ambient = u_LampSet[0].ambi * u_MatlSet[0].ambi;\n' +
    '  vec3 diffuse = u_LampSet[0].diff * v_Kd * nDotL;\n' +
    '  vec3 speculr = u_LampSet[0].spec * u_MatlSet[0].spec * e64;\n' +

    //Light Source 2 (headlight)
    '  vec3 lightDirection2 = normalize(u_LampSet[1].pos - v_Position.xyz);\n' +
    '  float nDotL2 = max(dot(lightDirection2, normal), 0.0); \n' +
    // ? vvvvvvvvvvvvvvvvvvvvvvvv
    '  vec3 H2 = normalize(lightDirection2 + eyeDirection); \n' +
    '  float nDotH2 = max(dot(H2, normal), 0.0); \n' +
    '  float e64_2 = pow(nDotH2, float(u_MatlSet[0].shiny));\n' + // pow() won't accept integer exponents! Convert K_shiny!  
    // ? ^^^^^^^^^^^^^^^^^^^^^^^^
    '  vec3 ambient2 = u_LampSet[1].ambi * u_MatlSet[0].ambi;\n' +
    '  vec3 diffuse2 = u_LampSet[1].diff * v_Kd * nDotL2;\n' +
    '  vec3 speculr2 = u_LampSet[1].spec * u_MatlSet[0].spec * e64_2;\n' +

    '  gl_FragColor = vec4(emissive + ambient + diffuse + speculr + ambient2 + diffuse2 + speculr2 , 1.0);\n' +
    '}\n';


var PhongPhongVert = 
    "struct MatlT {\n" +
    "		vec3 emit;\n" + // Ke: emissive -- surface 'glow' amount (r,g,b);
    "		vec3 ambi;\n" + // Ka: ambient reflectance (r,g,b)
    "		vec3 diff;\n" + // Kd: diffuse reflectance (r,g,b)
    "		vec3 spec;\n" + // Ks: specular reflectance (r,g,b)
    "		int shiny;\n" + // Kshiny: specular exponent (integer >= 1; typ. <200)
    "		};\n" +
    "attribute vec4 a_Position; \n" +
    "attribute vec4 a_Normal; \n" +
    // 	'uniform vec3 u_Kd; \n' +	//reflect entire sphere	 Later: as vertex attrib
    "uniform MatlT u_MatlSet[1];\n" + // Array of all materials.
    "uniform mat4 u_MvpMatrix; \n" +
    "uniform mat4 u_ModelMatrix; \n" +
    "uniform mat4 u_NormalMatrix; \n" +

    //-------------VARYING:Vertex Shader values sent per-pixel to Fragment shader:
    "varying vec3 v_Kd; \n" + // Phong Lighting: diffuse reflectance
    "varying vec4 v_Position; \n" +
    "varying vec3 v_Normal; \n" + // Why Vec3? its not a point, hence w==0

    "void main() { \n" +
    "  gl_Position = u_MvpMatrix * a_Position;\n" +
    "  v_Position = u_ModelMatrix * a_Position; \n" +
    "  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n" +
    "  v_Kd = u_MatlSet[0].diff; \n" + // find per-pixel diffuse reflectance from per-vertex
    "}\n";

var PhongPhongFrag =  
    'precision highp float;\n' +
    'precision highp int;\n' +
  
    //--------------- GLSL Struct Definitions:
    'struct LampT {\n' +		// Describes one point-like Phong light source
    '	vec3 pos;\n' +			// (x,y,z,w); w==1.0 for local light at x,y,z position
    ' 	vec3 ambi;\n' +			// Ia ==  ambient light source strength (r,g,b)
    ' 	vec3 diff;\n' +			// Id ==  diffuse light source strength (r,g,b)
    '	vec3 spec;\n' +			// Is == specular light source strength (r,g,b)
    '}; \n' +

    'struct MatlT {\n' +		// Describes one Phong material by its reflectances:
    '		vec3 emit;\n' +			// Ke: emissive -- surface 'glow' amount (r,g,b);
    '		vec3 ambi;\n' +			// Ka: ambient reflectance (r,g,b)
    '		vec3 diff;\n' +			// Kd: diffuse reflectance (r,g,b)
    '		vec3 spec;\n' + 		// Ks: specular reflectance (r,g,b)
    '		int shiny;\n' +			// Kshiny: specular exponent (integer >= 1; typ. <200)
    '		};\n' +

    //-------------UNIFORMS: values set from JavaScript before a drawing command.
    'uniform LampT u_LampSet[1];\n' +		// Array of all light sources.
    'uniform MatlT u_MatlSet[1];\n' +		// Array of all materials.
    'uniform vec3 u_eyePosWorld; \n' + 	// Camera/eye location in world coords.

    //-------------VARYING:Vertex Shader values sent per-pixel to Fragment shader: 
    'varying vec3 v_Normal;\n' +				// Find 3D surface normal at each pix
    'varying vec4 v_Position;\n' +			// pixel's 3D pos too -- in 'world' coords
    'varying vec3 v_Kd;	\n' +						// Find diffuse reflectance K_d per pix

    'void main() { \n' +
    '  vec3 normal = normalize(v_Normal); \n' +
    '  vec3 lightDirection = normalize(u_LampSet[0].pos - v_Position.xyz);\n' +
    '  vec3 eyeDirection = normalize(u_eyePosWorld - v_Position.xyz); \n' +
    '  float nDotL = max(dot(lightDirection, normal), 0.0); \n' +
  
    // ? vvvvvvvvvvvvvvvvvvvvvvvv
    '  vec3 reflec = normalize(2.0*(normal * nDotL) - lightDirection); \n' + // ? phong no half
    '  float rDotV = max(dot(reflec, eyeDirection), 0.0); \n' +
    '  float e64 = pow(rDotV, float(u_MatlSet[0].shiny));\n' + // pow() won't accept integer exponents! Convert K_shiny!  
    // ? ^^^^^^^^^^^^^^^^^^^^^^^^
    '  vec3 emissive = u_MatlSet[0].emit;' +
    '  vec3 ambient = u_LampSet[0].ambi * u_MatlSet[0].ambi;\n' +
    '  vec3 diffuse = u_LampSet[0].diff * v_Kd * nDotL;\n' +
    '  vec3 speculr = u_LampSet[0].spec * u_MatlSet[0].spec * e64;\n' +
    '  gl_FragColor = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +
    '}\n';


var diffuseVert = // * not used but could be used with lightSpec 0
    "precision highp float;\n" +
    "attribute vec4 a_Position;\n" +
    "attribute vec3 a_Color;\n" +
    "attribute vec3 a_Normal;\n" +
    "varying vec4 v_Color;\n" +
    "uniform mat4 u_MvpMatrix;\n" +
    "uniform mat4 u_ModelMatrix;\n" + // Model matrix
    "uniform mat4 u_NormalMatrix;\n" +
    "void main() {\n" +
    "  vec4 transVec = u_NormalMatrix * vec4(a_Normal, 0.0);\n" +
    "  vec3 normVec = normalize(transVec.xyz);\n" +
    "  vec3 lightVec = vec3(0.1, 0.5, 0.7);\n" +
    "  gl_Position = u_MvpMatrix * a_Position;\n" +
    "  vec4 vertexPosition = u_ModelMatrix * a_Position;\n" +
    "  v_Color = vec4(0.7*a_Color + 0.3*dot(normVec,lightVec), 1.0);\n" +
    "}\n";

var diffuseFrag = // * not used but could be used with lightSpec 0
    "#ifdef GL_ES\n" +
    "precision highp float;\n" +
    "#endif\n" +
    "varying vec4 v_Color;\n" +
    "void main() {\n" +
    "  gl_FragColor = v_Color;\n" +
    "}\n";

var particleVert = 
    'precision mediump float;\n' +			// req'd in OpenGL ES if we use 'float'
    'uniform   int  u_runMode; \n' +			// particle system state: 
    'attribute vec4 a_Position;\n' +
    'varying   vec4 v_Color; \n' +
    "uniform   mat4 u_MvpMatrix;\n" +
    'void main() {\n' +
    '  gl_PointSize = 20.0;\n' +
    '  gl_Position = u_MvpMatrix * a_Position; \n' +	
    '  if(u_runMode == 0) { \n' +
    '	   v_Color = vec4(1.0, 0.0, 0.0, 1.0);	\n' + //color already assigned here		// red: 0==reset
    '  	 } \n' +
    '  else if(u_runMode == 1) {  \n' +
    '    v_Color = vec4(0.6, 0.6, 0.0, 1.0); \n' +	// yellow: 1==pause
    '    }  \n' +
    '  else if(u_runMode == 2) { \n' +    
    '    v_Color = vec4(0.6, 0.6, 0.6, 1.0); \n' +	// white: 2==step
    '    } \n' +
    '  else { \n' +
    '    v_Color = vec4(240/255, 255/255, 100/255, 1.0); \n' +	// green: >3==run
    '		 } \n' +
    '} \n';

var particleFrag =
    'precision mediump float;\n' +
    'varying vec4 v_Color; \n' +
    'void main() {\n' +
    '  float dist = distance(gl_PointCoord, vec2(0.5, 0.5)); \n' +
    '  if(dist < 0.5) { \n' +	
      '  	gl_FragColor = vec4((1.0-2.0*dist)*v_Color.rgb, 1.0);\n' +
      '  } else { discard; }\n' +
    '}\n';