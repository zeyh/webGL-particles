/* the VBO details including vertices/color/normals/indices*/

var plane_size = 40;
var plane_vertices = new Float32Array([
    plane_size/2, plane_size/2, 0,
    -1*plane_size/2, plane_size/2, 0,
    -1*plane_size/2, -1*plane_size/2, 0,
    plane_size/2, -1*plane_size/2, 0,
]);
var plane_normals = new Float32Array([   
    // 0, 1, 0,
    // 0, 1, 0,
    // 0, 1, 0,
    // 0, 1, 0,

    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,

    // 1, 0, 0,
    // 1, 0, 0,
    // 1, 0, 0,
    // 1, 0, 0,
]);
var plane_colors = new Float32Array([   
    0.3, 0.3, 0.3,
    0.3, 0.3, 0.3,
    0.3, 0.3, 0.3,
    0.3, 0.3, 0.3,
]);
var plane_indices = new Uint8Array([
    0,1,2,
    0,2,3,
]);

var cube_vertices = new Float32Array([
    1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0, // v0-v1-v2-v3 front
    1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0, // v0-v3-v4-v5 right
    1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0, // v0-v5-v6-v1 up
   -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0, // v1-v6-v7-v2 left
   -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0, // v7-v4-v3-v2 down
    1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0  // v4-v7-v6-v5 back
]);
var cube_colors = new Float32Array([
    0, 0.5, 1,   0, 0.5, 1,   0, 0.5, 1,   0, 0.5, 1,     // v0-v1-v2-v3 front
    0, 0.5, 1,   0, 0.5, 1,   0, 0.5, 1,  0, 0.5, 1,     // v0-v3-v4-v5 right
    0, 0.5, 1,   0, 0.5, 1,   0, 0.5, 1,   0, 0.5, 1,     // v0-v5-v6-v1 up
    0, 0.5, 1,    0, 0.5, 1,   0, 0.5, 1,   0, 0.5, 1,      // v1-v6-v7-v2 left
    0, 0.5, 1,    0, 0.5, 1,   0, 0.5, 1,  0, 0.5, 1,      // v7-v4-v3-v2 down
    0, 0.5, 1,    0, 0.5, 1,   0, 0.5, 1,   0, 0.5, 1, 　    // v4-v7-v6-v5 back
]);
var cube_colors_red = new Float32Array([
    1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v1-v2-v3 front
    1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v3-v4-v5 right
    1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v5-v6-v1 up
    1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v1-v6-v7-v2 left
    1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v7-v4-v3-v2 down
    1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0　    // v4-v7-v6-v5 back
 ]);
 var cube_colors_white = new Float32Array([
    1, 1, 0.9,   1, 1, 0.9,   1, 1, 0.9,  1, 1, 0.9,      // v0-v1-v2-v3 front
    1, 1, 0.9,   1, 1, 0.9,   1, 1, 0.9,  1, 1, 0.9,     // v0-v3-v4-v5 right
    1, 1, 0.9,   1, 1, 0.9,   1, 1, 0.9,  1, 1, 0.9,     // v0-v5-v6-v1 up
    1, 1, 0.9,   1, 1, 0.9,   1, 1, 0.9,  1, 1, 0.9,     // v1-v6-v7-v2 left
    1, 1, 0.9,   1, 1, 0.9,   1, 1, 0.9,  1, 1, 0.9,     // v7-v4-v3-v2 down
    1, 1, 0.9,   1, 1, 0.9,   1, 1, 0.9,  1, 1, 0.9　    // v4-v7-v6-v5 back
 ]);
 var cube_colors_multi = new Float32Array([
    0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  // v0-v1-v2-v3 front
    0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  // v0-v3-v4-v5 right
    1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  // v0-v5-v6-v1 up
    1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  // v1-v6-v7-v2 left
    1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  // v7-v4-v3-v2 down
    0.4, 1.0, 1.0,  0.4, 1.0, 1.0,  0.4, 1.0, 1.0,  0.4, 1.0, 1.0   // v4-v7-v6-v5 back
 ]);
var cube_normals = new Float32Array([
    0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
    0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
    0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
]);
var cube_indices = new Uint8Array([
    0, 1, 2,   0, 2, 3,    // front
    4, 5, 6,   4, 6, 7,    // right
    8, 9,10,   8,10,11,    // up
   12,13,14,  12,14,15,    // left
   16,17,18,  16,18,19,    // down
   20,21,22,  20,22,23     // back
]);

var [sphere_vertices, sphere_colors,sphere_indices] = generate_sphereVBOinfo(12, 0.9);
var [sphere_vertices2, sphere_colors2,sphere_indices2] = generate_sphereVBOinfo(4, 1.2);
var sphere_normals = sphere_vertices;
var sphere_normals2 = sphere_vertices2;
function generate_sphereVBOinfo(sphere_div, colorFactor){
    var SPHERE_DIV = sphere_div;
  
    var i, ai, si, ci;
    var j, aj, sj, cj;
    var p1, p2;
  
    var vertices = [];
    var colors = [];
    var indices = [];

    // Generate coordinates
    for (j = 0; j <= SPHERE_DIV; j++) {
      aj = j * Math.PI / SPHERE_DIV;
      sj = Math.sin(aj);
      cj = Math.cos(aj);
      for (i = 0; i <= SPHERE_DIV; i++) {
        ai = i * 2 * Math.PI / SPHERE_DIV;
        si = Math.sin(ai);
        ci = Math.cos(ai);
  
        vertices.push(si * sj);  // X
        vertices.push(cj);       // Y
        vertices.push(ci * sj);  // Z
      }
    }
  
    for (j = 0; j <= SPHERE_DIV; j++) {
        for (i = 0; i <= SPHERE_DIV; i++) {
          colors.push(200/255*colorFactor);  // X
          colors.push(80/255*colorFactor);       // Y
          colors.push(100/255*colorFactor);  // Z
        }
      }
    // Generate indices
    for (j = 0; j < SPHERE_DIV; j++) {
        for (i = 0; i < SPHERE_DIV; i++) {
        p1 = j * (SPHERE_DIV+1) + i;
        p2 = p1 + (SPHERE_DIV+1);

        indices.push(p1);
        indices.push(p2);
        indices.push(p1 + 1);

        indices.push(p1 + 1);
        indices.push(p2);
        indices.push(p2 + 1);
        }
    }
    return [vertices, colors, indices];
}

var [grid_vertices, grid_colors] = generate_gridVBOinfo(20);
var grid_normals = grid_vertices;
function generate_gridVBOinfo(xymax){
    var floatsPerVertex = 3; // # of Float32Array elements used for each vertex
    var xcount = 100; // # of lines to draw in x,y to make the grid.
    var ycount = 100;
    // var xymax = 50.0; // grid size; extends to cover +/-xymax in x and y.
    var xColr = new Float32Array([1.0, 1.0, 0.3]); // bright yellow
    var yColr = new Float32Array([0.5, 1.0, 0.5]); // bright green.

    var vertices = new Float32Array(floatsPerVertex * 2 * (xcount + ycount));
    var xgap = xymax / (xcount - 1); // HALF-spacing between lines in x,y;
    var ygap = xymax / (ycount - 1); // (why half? because v==(0line number/2))
    // First, step thru x values as we make vertical lines of constant-x:
    for (v = 0, j = 0; v < 2 * xcount; v++, j += floatsPerVertex) {
        if (v % 2 == 0) {
            // put even-numbered vertices at (xnow, -xymax, 0)
            vertices[j] = -xymax + v * xgap; // x
            vertices[j + 1] = -xymax; // y
            vertices[j + 2] = 0.0; // z
            vertices[j + 3] = 1.0; // w.
        } else {
            // put odd-numbered vertices at (xnow, +xymax, 0).
            vertices[j] = -xymax + (v - 1) * xgap; // x
            vertices[j + 1] = xymax; // y
            vertices[j + 2] = 0.0; // z
            vertices[j + 3] = 1.0; // w.
        }
    }
    // Second, step thru y values as wqe make horizontal lines of constant-y:
    // (don't re-initialize j--we're adding more vertices to the array)
    for (v = 0; v < 2 * ycount; v++, j += floatsPerVertex) {
        if (v % 2 == 0) {
            // put even-numbered vertices at (-xymax, ynow, 0)
            vertices[j] = -xymax; // x
            vertices[j + 1] = -xymax + v * ygap; // y
            vertices[j + 2] = 0.0; // z
            vertices[j + 3] = 1.0; // w.
        } else {
            // put odd-numbered vertices at (+xymax, ynow, 0).
            vertices[j] = xymax; // x
            vertices[j + 1] = -xymax + (v - 1) * ygap; // y
            vertices[j + 2] = 0.0; // z
            vertices[j + 3] = 1.0; // w.
        }
    }
    var floatsPerVertex2 = 3;
    var colors = new Float32Array(floatsPerVertex2 * 2 * (xcount + ycount));
    for (let v = 0, j = 0; v < 2 * xcount; v++, j += floatsPerVertex2) {
        colors[j + 0] = xColr[0]; // red
        colors[j + 1] = xColr[1]; // grn
        colors[j + 2] = xColr[2]; // blu
    }
    for (let v = 0; v < 2 * ycount; v++, j += floatsPerVertex2) {
        colors[j + 0] = yColr[0]; // red
        colors[j + 1] = yColr[1]; // grn
        colors[j + 2] = yColr[2]; // blu
    }
    return [vertices, colors];
}