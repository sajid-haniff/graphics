import {WeightedUnionFind} from "./WeightedQuickUnionUF";

export const unionFindDemo = (sk, CANVAS_WIDTH = 800, CANVAS_HEIGHT = 800) => {

    return {

        preload: () => {

        },
        setup: () => {

            sk.noCanvas();

            const uf = WeightedUnionFind(10);

            console.log("Initial state:");
            console.log("0 and 1 connected:", uf.connected(0, 1));
            console.log("4 and 9 connected:", uf.connected(4, 9));

            console.log("\nPerforming unions:");
            uf.union(0, 1);
            uf.union(2, 3);
            uf.union(4, 5);
            uf.union(6, 7);
            uf.union(8, 9);
            uf.union(0, 2);
            uf.union(4, 6);
            uf.union(0, 4);

            console.log("0 and 1 connected:", uf.connected(0, 1));
            console.log("4 and 9 connected:", uf.connected(4, 9));
            console.log("0 and 9 connected:", uf.connected(0, 9));

        }
    }
}

