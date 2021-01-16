// 2015.03.08   courtesy Alex Ayerdi
//------------------------------------------------------------------------------
// These emissive, ambient, diffuse, specular components were chosen for
// least-squares best-fit to measured BRDFs of actual material samples.
// (values copied from pg. 51, "Advanced Graphics Programming"
// Tom McReynolds, David Blythe Morgan-Kaufmann Publishers (c)2005).
//
// They demonstrate both the strengths and the weaknesses of Phong lighting: 
// if their appearance makes you ask "how could we do better than this?"
// then look into 'Cook-Torrance' shading methods, texture maps, bump maps, 
// and beyond.
//
// Define names for each of our Phong Material Types:

var MATL_RED_PLASTIC = 1;
var MATL_GRN_PLASTIC = 2;
var MATL_BLU_PLASTIC = 3;
var MATL_BLACK_PLASTIC = 4;
var MATL_BLACK_RUBBER = 5;
var MATL_BRASS = 6;
var MATL_BRONZE_DULL = 7;
var MATL_BRONZE_SHINY = 8;
var MATL_CHROME = 9;
var MATL_COPPER_DULL = 10;
var MATL_COPPER_SHINY = 11;
var MATL_GOLD_DULL = 12;
var MATL_GOLD_SHINY = 13;
var MATL_PEWTER = 14;
var MATL_SILVER_DULL = 15;
var MATL_SILVER_SHINY = 16;
var MATL_EMERALD = 17;
var MATL_JADE = 18;
var MATL_OBSIDIAN = 19;
var MATL_PEARL = 20;
var MATL_RUBY = 21;
var MATL_TURQUOISE = 22;
var DEFAULT = 23;					// (used for unrecognized material names)

/*
Create a material object by doing... 
(where 'materialType' is one of the following MATL_*** above)
  
  var material = new Material(materialType);

Access emissive, ambience, specular, diffuse, and shiny attributes by accessing the object

  material.emissive[0]  material.emissive[1] ....
  material.ambient[0]   material.ambient[1] .... 
  material.specular[0]  material.specular[1] ....
  material.diffuse[0]   material.diffuse[1] ....
  material.shiny  <- this is a single floating point value

Your javascript would then have something like the following to set your shader values for lighting...

gl.uniform3f(u_Ke, material.emissive[0], material.emissive[1], material.emissive[2]);
etc....

*/
function Material(materialType)
{
	var K_emit = [];
	var K_ambi = [];
	var K_spec = [];
	var K_diff = [];
	var K_shiny = 0.0;

	switch(materialType)
	{
		case MATL_RED_PLASTIC: // 1
			K_emit.push(0.0,     0.0,    0.0,    1.0);
			K_ambi.push(0.1,     0.1,    0.1,    1.0);
			K_diff.push(0.6,     0.0,    0.0,    1.0);
			K_spec.push(0.6,     0.6,    0.6,    1.0);   
			K_shiny = 100.0;
			break;
		case MATL_GRN_PLASTIC: // 2
			K_emit.push(0.0,     0.0,    0.0,    1.0);
			K_ambi.push(0.05,    0.05,   0.05,   1.0);
			K_diff.push(0.0,     0.6,    0.0,    1.0);
			K_spec.push(0.2,     0.2,    0.2,    1.0);   
			K_shiny = 60.0;
			break;
		case MATL_BLU_PLASTIC: // 3
			K_emit.push(0.0,     0.0,    0.0,    1.0);
			K_ambi.push(0.05,    0.05,   0.05,   1.0);
			K_diff.push(0.0,     0.2,    0.6,    1.0);
			K_spec.push(0.1,     0.2,    0.3,    1.0);   
			K_shiny = 5.0;
			break;
		case MATL_BLACK_PLASTIC:
			K_emit.push(0.0,     0.0,    0.0,    1.0);
			K_ambi.push(0.0,     0.0,    0.0,    1.0);
			K_diff.push(0.01,    0.01,   0.01,   1.0);
			K_spec.push(0.5,     0.5,    0.5,    1.0);   
			K_shiny = 32.0;
			break;
		case MATL_BLACK_RUBBER:
			K_emit.push(0.0,     0.0,    0.0,    1.0);
			K_ambi.push(0.02,    0.02,   0.02,   1.0);
			K_diff.push(0.01,    0.01,   0.01,   1.0);
			K_spec.push(0.4,     0.4,    0.4,    1.0);   
			K_shiny = 10.0;
			break;
		case MATL_BRASS:
			K_emit.push(0.0,      0.0,      0.0,      1.0);
			K_ambi.push(0.329412, 0.223529, 0.027451, 1.0);
			K_diff.push(0.780392, 0.568627, 0.113725, 1.0);
			K_spec.push(0.992157, 0.941176, 0.807843, 1.0);   
			K_shiny = 27.8974;
			break;
		case MATL_BRONZE_DULL:
			K_emit.push(0.0,      0.0,      0.0,      1.0);
			K_ambi.push(0.2125,   0.1275,   0.054,    1.0);
			K_diff.push(0.714,    0.4284,   0.18144,  1.0);
			K_spec.push(0.393548, 0.271906, 0.166721, 1.0);  
			K_shiny = 25.6;
			break;
		case MATL_BRONZE_SHINY:
			K_emit.push(0.0,      0.0,      0.0,      1.0);
			K_ambi.push(0.25,     0.148,    0.06475,  1.0);
			K_diff.push(0.4,      0.2368,   0.1036,   1.0);
			K_spec.push(0.774597, 0.458561, 0.200621, 1.0);  
			K_shiny = 76.8;
			break;
		case MATL_CHROME:
			K_emit.push(0.0,      0.0,      0.0,      1.0);
			K_ambi.push(0.25,     0.25,     0.25,     1.0);
			K_diff.push(0.4,      0.4,      0.4,      1.0);
			K_spec.push(0.774597, 0.774597, 0.774597, 1.0);  
			K_shiny = 76.8;
			break;
		case MATL_COPPER_DULL:
			K_emit.push(0.0,      0.0,      0.0,      1.0);
			K_ambi.push(0.19125,  0.0735,   0.0225,   1.0);
			K_diff.push(0.7038,   0.27048,  0.0828,   1.0);
			K_spec.push(0.256777, 0.137622, 0.086014, 1.0);  
			K_shiny = 12.8;
			break;
		case MATL_COPPER_SHINY:
			K_emit.push(0.0,      0.0,      0.0,       1.0);
			K_ambi.push(0.2295,   0.08825,  0.0275,    1.0);
			K_diff.push(0.5508,   0.2118,   0.066,     1.0);
			K_spec.push(0.580594, 0.223257, 0.0695701, 1.0);  
			K_shiny = 51.2;
			break;
		case MATL_GOLD_DULL:
			K_emit.push(0.0,      0.0,      0.0,      1.0);
			K_ambi.push(0.24725,  0.1995,   0.0745,   1.0);
			K_diff.push(0.75164,  0.60648,  0.22648,  1.0);
			K_spec.push(0.628281, 0.555802, 0.366065, 1.0);  
			K_shiny = 51.2;
			break;
		case MATL_GOLD_SHINY:
			K_emit.push(0.0,      0.0,      0.0,      1.0);
			K_ambi.push(0.24725,  0.2245,   0.0645,   1.0);
			K_diff.push(0.34615,  0.3143,   0.0903,   1.0);
			K_spec.push(0.797357, 0.723991, 0.208006, 1.0);  
			K_shiny = 83.2;
			break;
		case MATL_PEWTER:
			K_emit.push(0.0,      0.0,      0.0,      1.0);
			K_ambi.push(0.105882, 0.058824, 0.113725, 1.0);
			K_diff.push(0.427451, 0.470588, 0.541176, 1.0);
			K_spec.push(0.333333, 0.333333, 0.521569, 1.0);  
			K_shiny = 9.84615;
			break;
		case MATL_SILVER_DULL:
			K_emit.push(0.0,      0.0,      0.0,      1.0);
			K_ambi.push(0.19225,  0.19225,  0.19225,  1.0);
			K_diff.push(0.50754,  0.50754,  0.50754,  1.0);
			K_spec.push(0.508273, 0.508273, 0.508273, 1.0);  
			K_shiny = 51.2;
			break;
		case MATL_SILVER_SHINY:
			K_emit.push(0.0,      0.0,      0.0,      1.0);
			K_ambi.push(0.23125,  0.23125,  0.23125,  1.0);
			K_diff.push(0.2775,   0.2775,   0.2775,   1.0);
			K_spec.push(0.773911, 0.773911, 0.773911, 1.0);  
			K_shiny = 89.6;
			break;
		case MATL_EMERALD:
			K_emit.push(0.0,     0.0,      0.0,     1.0);
			K_ambi.push(0.0215,  0.1745,   0.0215,  0.55);
			K_diff.push(0.07568, 0.61424,  0.07568, 0.55);
			K_spec.push(0.633,   0.727811, 0.633,   0.55);   
			K_shiny = 76.8;
			break;
		case MATL_JADE:
			K_emit.push(0.0,      0.0,      0.0,      1.0);
			K_ambi.push(0.135,    0.2225,   0.1575,   0.95);
			K_diff.push(0.54,     0.89,     0.63,     0.95);
			K_spec.push(0.316228, 0.316228, 0.316228, 0.95);   
			K_shiny = 12.8;
			break;
		case MATL_OBSIDIAN:
			K_emit.push(0.0,      0.0,      0.0,      1.0);
			K_ambi.push(0.05375,  0.05,     0.06625,  0.82);
			K_diff.push(0.18275,  0.17,     0.22525,  0.82);
			K_spec.push(0.332741, 0.328634, 0.346435, 0.82);   
			K_shiny = 38.4;
			break;
		case MATL_PEARL:
			K_emit.push(0.0,      0.0,      0.0,      1.0);
			K_ambi.push(0.25,     0.20725,  0.20725,  0.922);
			K_diff.push(1.0,      0.829,    0.829,    0.922);
			K_spec.push(0.296648, 0.296648, 0.296648, 0.922);   
			K_shiny = 11.264;
			break;
		case MATL_RUBY:
			K_emit.push(0.0,      0.0,      0.0,      1.0);
			K_ambi.push(0.1745,   0.01175,  0.01175,  0.55);
			K_diff.push(0.61424,  0.04136,  0.04136,  0.55);
			K_spec.push(0.727811, 0.626959, 0.626959, 0.55);   
			K_shiny = 76.8;
			break;
		case MATL_TURQUOISE: // 22
			K_emit.push(0.0,      0.0,      0.0,      1.0);
			K_ambi.push(0.1,      0.18725,  0.1745,   0.8);
			K_diff.push(0.396,    0.74151,  0.69102,  0.8);
			K_spec.push(0.297254, 0.30829,  0.306678, 0.8);   
			K_shiny = 12.8;
			break;

		default:
			// ugly featureless (emissive-only) red:
			K_emit.push(0.5, 0.0, 0.0, 1.0); // DEFAULT: ugly RED emissive light only
			K_ambi.push(0.0, 0.0, 0.0, 1.0); // r,g,b,alpha  ambient reflectance
			K_diff.push(0.0, 0.0, 0.0, 1.0); //              diffuse reflectance
			K_spec.push(0.0, 0.0, 0.0, 1.0); //              specular reflectance
			K_shiny = 1.0;        // Default (don't set specular exponent to zero!)
			break;
	}
	
	return {emissive: K_emit, ambient: K_ambi, diffuse: K_diff, specular: K_spec, shiny: K_shiny};
}