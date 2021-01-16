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
//		Created; relies on cuon-matrix.js supplied with our textbook.

var LightsT = function() {
//===============================================================================
// Constructor function:
	var I_pos = new Vector4();	// x,y,z,w:   w==1 for local 3D position,
															// w==0 for light at infinity in direction (x,y,z)
	var isLit = false;						// true/false for ON/OFF
	var I_ambi = new Vector3();		// ambient illumination: r,g,b
	var I_diff = new Vector3();		// diffuse illumination: r,g,b.
	var I_spec = new Vector3();		// specular illumination: r,g,b.
	//
	var u_pos = false;						// GPU location for 'uniform' that holds I_pos
	var u_ambi = false;						// 																			 I_ambi
	var u_diff = false;						//																			 I_diff
	var u_spec = false;						//																			 I_spec.
	
		return {I_pos, isLit, I_ambi, I_diff, I_spec, 
		        u_pos,        u_ambi, u_diff, u_spec};
}
