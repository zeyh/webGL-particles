"use strict"

/**
 * @param {int} index of particles in g_particleArray from main.js
 */
function drawParticle(index, g_modelMatrix, g_viewProjMatrix) {
    if (g_particleArray[index].runMode > 1) { // 0=reset; 1= pause; 2=step; 3=run
        if (g_particleArray[index].runMode == 2) {
            g_particleArray[index].runMode = 1;
        }
        g_particleArray[index].applyForces(g_particleArray[index].s1, g_particleArray[index].forceList, index);  // find current net force on each particle
        g_particleArray[index].dotFinder(g_particleArray[index].s1dot, g_particleArray[index].s1); // find time-derivative s1dot from s1;
        g_particleArray[index].switchToMe();
        g_particleArray[index].render(g_modelMatrix, g_viewProjMatrix);   // transfer current state to VBO, set uniforms, draw it!
        g_particleArray[index].solver();         // find s2 from s1 & related states.
        g_particleArray[index].doConstraints();  // Apply all constraints.  s2 is ready!
        g_particleArray[index].swap();           // Make s2 the new current state
    }
    else {
        g_particleArray[index].switchToMe();
        g_particleArray[index].render(g_modelMatrix, g_viewProjMatrix);
    }
}

/**
 * @param {array} array of vbo, MUST Match the g_vboArray in main.js
 */
function drawAll([grid, plane, sphere_test, sphere, cube]) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    // Clear color and depth buffer

    // cloth
    pushMatrix(g_modelMatrix);
    g_modelMatrix.setTranslate(-1.6, 1.5, 3.6);
    drawParticle(CLOTH, g_modelMatrix, g_viewProjMatrix);
    if (!hideSphere) {
        pushMatrix(g_modelMatrix);
        g_modelMatrix.scale(params.ClothSpacing * params.ClothWidth * 0.55, 0.02, 0.02);
        g_modelMatrix.translate(0.7, 2, 0);
        cube.switchToMe();
        cube.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();
        pushMatrix(g_modelMatrix);
        g_modelMatrix.scale(0.05, 1.05, 0.05);
        g_modelMatrix.translate(-3.8, -0.945, 0);
        cube.switchToMe();
        cube.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();
    }
    g_modelMatrix = popMatrix();


    // particle flying boids
    pushMatrix(g_modelMatrix);
    g_modelMatrix.setTranslate(2, 3.2, 0);
    drawParticle(BOID, g_modelMatrix, g_viewProjMatrix);
    g_modelMatrix = popMatrix();

    // particle FIRE
    pushMatrix(g_modelMatrix);
    g_modelMatrix.setTranslate(-0.6, 0.4, 1.48);
    drawParticle(FIRE, g_modelMatrix, g_viewProjMatrix);
    if (!hideSphere) {
        // draw woods under fire
        pushMatrix(g_modelMatrix);
        g_modelMatrix.setTranslate(-0.7, -0.5, 1.5);
        g_modelMatrix.rotate(30, 0, 0, 1);
        g_modelMatrix.rotate(-80, 1, 0, 0);
        g_modelMatrix.scale(0.18, 0.02, 0.02);
        cube.switchToMe();
        cube.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();

        pushMatrix(g_modelMatrix);
        g_modelMatrix.setTranslate(-0.7, -0.5, 1.5);
        g_modelMatrix.rotate(30, 0, 0, 1);
        g_modelMatrix.rotate(150, 1, 0, 0);
        g_modelMatrix.scale(0.18, 0.02, 0.02);
        cube.switchToMe();
        cube.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();

        pushMatrix(g_modelMatrix);
        g_modelMatrix.setTranslate(-0.5, -0.5, 1.5);
        g_modelMatrix.rotate(-30, 0, 0, 1);
        g_modelMatrix.rotate(-80, 1, 0, 0);
        g_modelMatrix.scale(0.18, 0.02, 0.02);
        cube.switchToMe();
        cube.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();

        pushMatrix(g_modelMatrix);
        g_modelMatrix.setTranslate(-0.5, -0.5, 1.5);
        g_modelMatrix.rotate(-30, 0, 0, 1);
        g_modelMatrix.rotate(120, 1, 0, 0);
        g_modelMatrix.scale(0.18, 0.02, 0.02);
        cube.switchToMe();
        cube.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();

        pushMatrix(g_modelMatrix);
        g_modelMatrix.setTranslate(-0.6, -0.5, 1.4);
        g_modelMatrix.rotate(60, 0, 0, 1);
        g_modelMatrix.rotate(-40, 0, 1, 0);
        g_modelMatrix.scale(0.18, 0.02, 0.02);
        cube.switchToMe();
        cube.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();
        pushMatrix(g_modelMatrix);
        g_modelMatrix.setTranslate(-0.6, -0.5, 1.4);
        g_modelMatrix.rotate(60, 0, 0, 1);
        g_modelMatrix.rotate(-40, 0, 1, 0);
        g_modelMatrix.rotate(120, 1, 0, 0);
        g_modelMatrix.scale(0.18, 0.02, 0.02);
        cube.switchToMe();
        cube.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();
    }
    g_modelMatrix = popMatrix();

    // particle SAND
    pushMatrix(g_modelMatrix);
    g_modelMatrix.setTranslate(1.2, 0.0, 4.5);
    drawParticle(SAND, g_modelMatrix, g_viewProjMatrix);
    g_modelMatrix = popMatrix();


    //draw draggable light source on sphere
    if (hideSphere) {
        pushMatrix(g_modelMatrix);
        g_modelMatrix.setScale(1.5, 1.5, 1.5);
        g_modelMatrix.translate(2, 2.2, 0);
        g_modelMatrix.rotate(currentAngle, 0, 1, 0);
        sphere_test.switchToMe();
        sphere_test.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();
    }

    //draw grid
    if (!hideGrid) {
        pushMatrix(g_modelMatrix);
        g_modelMatrix.rotate(-90.0, 1, 0, 0);
        g_modelMatrix.translate(0.0, 0.0, -0.6);
        g_modelMatrix.scale(0.4, 0.4, 0.4);
        grid.switchToMe();
        grid.draw(g_modelMatrix, g_viewProjMatrix);
        g_modelMatrix = popMatrix();
    } else {
        // pushMatrix(g_modelMatrix);
        // g_modelMatrix.rotate(-90.0, 1, 0, 0);
        // g_modelMatrix.translate(0.0, 0.0, -0.6);
        // g_modelMatrix.scale(0.4, 0.4, 0.4);
        // plane.switchToMe();
        // plane.draw(g_modelMatrix, g_viewProjMatrix);
        // g_modelMatrix = popMatrix();
    }

    // particle testing bouncy ball
    // pushMatrix(g_modelMatrix);
    // g_modelMatrix.setTranslate(-1, 0.4, 1);
    // drawParticle(TEST, g_modelMatrix, g_viewProjMatrix);
    // g_modelMatrix = popMatrix();
    // pushMatrix(g_modelMatrix);

    // particle BOUNCYBALL
    // pushMatrix(g_modelMatrix);
    // g_modelMatrix.setTranslate(1, 0.4, 1);
    // drawParticle(BOUNCYBALL, g_modelMatrix, g_viewProjMatrix);
    // g_modelMatrix = popMatrix();
    // pushMatrix(g_modelMatrix);

    // particle SPRINGMASS
    // pushMatrix(g_modelMatrix);
    // g_modelMatrix.setTranslate(-1, -0.5, 1);
    // drawParticle(SPRINGMASS, g_modelMatrix, g_viewProjMatrix);
    // g_modelMatrix = popMatrix();
    // pushMatrix(g_modelMatrix);


}