//23456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
//
//		lights_JT.js		
//
//	A JavaScript library for objects that describe point-light sources suitable 
// for 3D rendering with Phong lighting (ambient, diffuse, specular).Its light 
// emanates either from a local position (x,y,z,w=1), or arrives at all points 
// in the 3D scene from the same direction (x,y,z,w=0) as if emanating from a 
// very distant source such as the sun.
// 
//	Later you may wish to expand this kind of object to describe a point-light
// source with a directional beam; just add a 'look-at' point and a beam-width
// exponent (similar to specular exponent: see Lengyel Chapter 7).  You may also 
// wish to add attenuation parameters for lights whose illumination decreases 
// with distance, etc.
//
//		2016.02.29 J. Tumblin, Northwestern University EECS Dept.
//		Created, based on cuon-matrix.js supplied with our textbook.

var LightT = function(opt_arg) {
//===============================================================================
// Constructor; if given another LightT object as an (optional) argument, use it
// to initialize all our member variables' values.  If no usable argument given,
// make a 'default' light at the world-space origin.
  var i, s, d;
  if(opt_arg && typeof opt_arg ==='object' &&opt_arg.hasOwnProperty('elements')) {
    src = opt_arg.elements;
    d = new Float32Array(16);
    for (i = 0; i < 16; ++i) {
      d[i] = s[i];
    }
    this.elements = d;
  } else {
    this.elements = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  }
};
 
/**
 * Set the identity matrix.
 * @return this
 */
Matrix4.prototype.setIdentity = function() {
  var e = this.elements;
  e[0] = 1;   e[4] = 0;   e[8]  = 0;   e[12] = 0;
  e[1] = 0;   e[5] = 1;   e[9]  = 0;   e[13] = 0;
  e[2] = 0;   e[6] = 0;   e[10] = 1;   e[14] = 0;
  e[3] = 0;   e[7] = 0;   e[11] = 0;   e[15] = 1;
  return this;
};
