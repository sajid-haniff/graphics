import * as vec2  from '../lib/esm/vec2';  // Use vec2 from your library
import { createGraphicsContext2 } from '../graphics_context2';  // Use your graphics context system
import { createVehicle } from './createVehicle';  // Import the createVehicle function

export const createSeekDemo = (sk, CANVAS_WIDTH = 1000, CANVAS_HEIGHT = 1000) => {
    // Create graphics context
    // Define the drawing area and viewport
    let win  = {left: -100, right: 100, top: 100, bottom: -100};
    let view = {left: 0.1, right: 0.9, top: 0.9, bottom: 0.1};

    // Create a graphics context for drawing
    const ctx = createGraphicsContext2(win, view, CANVAS_WIDTH, CANVAS_HEIGHT, sk);
    const {sx, sy, tx, ty} = ctx.viewport;

    // Initialize the vehicle in the center of the canvas
    //const vehicle = createVehicle(sk, vec2.fromValues(0, 0));

    // Initialize multiple vehicles
    const vehicles = [
        createVehicle(sk, vec2.fromValues(0, 0), 3, 0.1, 'seek', [127, 127, 7]),  // First vehicle
        createVehicle(sk, vec2.fromValues(20, 20), 2, 0.2, 'flee', [0, 127, 255]), // Second vehicle with different initial position and color
        //createVehicle(sk, vec2.fromValues(0, 0), 5, 0.1, 'pursuit', [127, 127, 7]),  // Vehicle with pursuit behavior
        //createVehicle(sk, vec2.fromValues(20, 20), 5, 0.1, 'evade', [255, 0, 0])    // Vehicle with evade behavior
    ];

    let target = vec2.create();  // The target will be set to the mouse position

    const fleer = createVehicle(sk, vec2.fromValues(20, 20), 3, 0.1, 'flee', [0, 127, 255]); // Fleeing vehicle
    const pursuer = createVehicle(sk, vec2.fromValues(-50, -50), 5, 0.1, 'pursuit', [127, 127, 7]); // Pursuing vehicle

    const wanderer = createVehicle(sk, vec2.fromValues(0, 0), 3, 0.1, 'wander', [0, 255, 0]); // Green color for visual distinction

    return {
        setup() {
            sk.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);  // Set up the canvas
            sk.background(51);  // Set initial background color
            //sk.noLoop();
        },
        display() {

            sk.applyMatrix(1, 0, 0, -1, 0, CANVAS_HEIGHT);
            sk.applyMatrix(CANVAS_WIDTH, 0, 0, CANVAS_HEIGHT, 0, 0);
            sk.applyMatrix(sx, 0, 0, sy, tx, ty);

            sk.background(51);  // Clear the canvas each frame

            // Update the target to follow the mouse position
            const mousePos = ctx.mouseToWindowCoordinates(sk);
            vec2.set(target, mousePos.x, mousePos.y);
            //vec2.set(target, sk.random(-100,100),sk.random(-100,100));

            // Update the vehicle's position toward the target
            //vehicle.update(target);

            // Draw the vehicle
            //svehicle.display();

            vehicles.forEach(vehicle => {
                vehicle.update(target);  // Update the vehicle's position toward the target
                vehicle.display();      // Render the vehicle
            });

            // Fleer updates position based on the mouse position
            //fleer.update(target);

            // Pursuer updates its position to pursue the fleer
           // pursuer.update(fleer);  // Pass the fleer as a target for the pursuer

            // Draw both vehicles
            //fleer.display();
            //pursuer.display();

            //wanderer.update();  // No specific target needed for wander behavior
            //wanderer.display();

            // Visualize the target as a red circle
            sk.fill(255, 0, 0);
            sk.ellipse(target[0], target[1], 6, 6);
        }
    };
};
