/*!
 * Illustrator QR v1.0
 * -------------------------------------------------------------------
 * An Adobe Illustrator script to create a vector QR Code. This script
 * strives to create a little paths and points as possible.
 *
 * This script wraps the qrcode library which can be found here:
 * http://www.d-project.com/qrcode/index.html
 *
 * Author: David Street
 * Created: September 2012
 *
 * Licensed under the MIT license.
 *
 * ENJOY!
 */


#include "includes/qrcode.js"
#target illustrator

/*
 * Helper Methods
 */

Array.prototype.isEqualTo = function(arr) {
	var key;

	if ( this.length !== arr.length ) {
		return false;
	}

	for ( key in this ) {
		if ( this[key] !== arr[key] ) {
			return false;
		}
	}

	return true;
}

Array.prototype.has = function(ele) {
	var i = 0
		, length = this.length;

	for ( i; i < length; i += 1 ) {

		if ( typeof(ele) === 'object' && typeof(this[i]) === 'object' ) {

			if ( this[i].isEqualTo(ele) ) {
				return true;
			}

		} else {

			if ( ele === this[i] ) {
				return true;
			}

		}

	}

	return false;
}


/*
 * IllustratorQR Class
 */

var IllustratorQR = function() {

	var grid = []

		, gridRows = 0
		, gridCols = 0

		// Incremental variables used for looping through the grid's rows
		// and columns.
		, r = 0
		, c = 0

		// Map barrier positions to their coresponding move functions.
		, directionMap = [moveRight, moveDown, moveLeft, moveUp]

		// Array of all completed polygons.
		// Element prototype: { color: 0, points: [[0, 0]] }
		, polygons = []

		// Temporary polygon
		, newPoly = {}

		// The current point
		, lineCursor = []

		, prevDirection = 0

		// The block color we are currently working with.
		, currentColor = 0

		// Illustrator Document
		, illDocument;


	this.init = function(_modules, _illDoc) {
		var r = 0
			, c = 0
			, rowLength = _modules.length
			, colLength = _modules[0].length;

		// Reverse colors
		for ( r = 0; r < rowLength; r += 1 ) {
			for ( c = 0; c < colLength; c += 1 ) {
				_modules[r][c] = ~~_modules[r][c];
			}
		}

		grid = _modules;
		gridRows = rowLength;
		gridCols = colLength;
		illDocument = _illDoc;
	};

	this.make = function(size) {

		for ( r; r < gridRows; r += 1 ) {

			currentColor = grid[r][0];

			for ( c; c < gridCols; c += 1 ) {
				
				// Look for a block that hasn't yet been captured, and has the
				// current color we are looking for.
				if ( grid[r][c] === currentColor) {

					if ( !isCaptured([r, c], [r, c]) ) {

						// Assign a new polygon with the current color.
						newPoly = {
							color: currentColor,
							points: []
						}

						// Set start point.
						setPoint( [c, r], newPoly );

						// Set initial direction.
						prevDirection = 0;

						// Advance to the right and set the new point.
						setPoint( [c + 1, r], newPoly );

						// Look for other blocks to complete the polygon.
						while ( !lineCursor.isEqualTo(newPoly.points[0]) ) {
							newPosition = getNextPosition( newPoly);

							setPoint( newPosition, newPoly );
						}

						// Add the polygon to the stack.
						polygons.push( newPoly );

						drawPath( getIllustratorPoints(newPoly.points, size), newPoly.color, illDocument );
					}

					// Switch colors.
					currentColor = ~~!currentColor;

				}

			}

			// Reset column count
			c = 0;
		}

	}

	/*
	 * Grid Methods
	 */

	// Check if the block (given by row and column) is within the grid.
	function inGrid(r, c) {
		if ( (r > (gridRows - 1) || r < 0)
			|| (c > (gridCols - 1) || c < 0) ) {

			return false;
		}

		return true;
	}

	// Get the four vertices of the given block.
	function getVertices(block) {
		var i = 0
			, x = 0
			, y = 0
			, vertices = [];

		for ( var i = 0, x = 0, y = 0; i < 4; i += 1 ) {
			vertices.push( [block[1] + x, block[0] + y] );

			x = (i % 2 === 0) ? ~~!x : x;
			y = (i >= 1) ? 1 : 0;
		}

		return vertices;
	}

	// Check if a block has been captured by a polygon of the same color.
	function isCaptured(block, origBlock, direction) {
		var vertices = getVertices( block )
			, captured = false
			, v = 0
			, poly = 0
			, p = 0
			, c = block[1]
			, r = block[0]
			, direction = direction || 'left'
			, checkColor = grid[origBlock[0]][origBlock[1]];

		// If block is outside bounds, then it hasn't been captured.
		if ( c < 0 || r < 0 || c > (gridCols - 1) || r > (gridRows - 1) ) {
			return false;
		}

		// Can't be a block of the opposite color
		if ( (checkColor !== undefined) && (grid[r][c] !== checkColor) ) {
			if ( direction === 'left' ) {
				direction = 'right';
				vertices = getVertices( origBlock );
				c = origBlock[1];
				r = origBlock[0];
			} else {
				return false;
			}
		}

		// If two consecutive points in a polygon are vertices of the block,
		// then it is captured.
		for ( poly; poly < polygons.length; poly += 1 ) {
			
			if ( polygons[poly].color === currentColor ) {

				for ( p = 0; p < polygons[poly].points.length; p += 1 ) {
					if ( vertices.has(polygons[poly].points[p]) && vertices.has(polygons[poly].points[p+1]) ) {
						return true;
					}
				}

			}
		}

		if ( direction === 'left' ) {
			// Check block to the left.
			if ( isCaptured([r, c - 1], origBlock) ) {
				return true;
			}

			// Check block to the top.
			if ( isCaptured([r - 1, c], origBlock) ) {
				return true;
			}

		} else {
			// Check block to the right.
			if ( isCaptured([r, c + 1], origBlock, 'right') ) {
				return true;
			}

			// Check block to the bottom.
			if ( isCaptured([r + 1, c], origBlock, 'right') ) {
				return true;
			}
		}

		return false;
	}

	function isCheckerd(point) {

		if ( (point[1] > 0 && point[1] < (gridRows)) && (point[0] > 0 && point[0] < (gridCols)) ) {
			if ( (grid[point[1] - 1][point[0] - 1] === grid[point[1]][point[0]]) &&
				grid[point[1] - 1][point[0]] === grid[point[1]][point[0] - 1] &&
				grid[point[1]][point[0]] !== grid[point[1] - 1][point[0]] ) {

				return true;
			}
		}

		return false;
	}


	/*
	 * Polygon Methods
	 */

	// Set the line cursor to the given point and adds it to the polygon's
	// point array.
	function setPoint(point, polygon) {
		lineCursor = [point[0], point[1]];
		polygon.points.push( [point[0], point[1]] );
	}

	// Checks if the polygon has a given point.
	function hasPoint(polygon, point) {
		var p = 0;

		for ( p in polygon.points ) {
			if ( point.isEqualTo(polygon.points[p]) ) {
				return true;
			}
		}

		return false;
	}


	/*
	 * Directional Methods
	 */

	function moveRight(point) {

		// If we can't move right
		if ( !inGrid(point[1], point[0]) ||
			grid[point[1]][point[0]] === ~~!currentColor ) {

			return false;
		}

		

		return [point[0] + 1, point[1]];
	}

	function moveDown(point) {
		
		// If we can't move down
		if ( !inGrid(point[1], point[0] - 1) ||
			grid[point[1]][point[0] - 1] === ~~!currentColor ) {

			return false;
		}

		return [point[0], point[1] + 1];
	}

	function moveLeft(point) {

		// If we can't move left
		if ( !inGrid(point[1] - 1, point[0] - 1) ||
			grid[point[1] - 1][point[0] - 1] === ~~!currentColor ) {

			return false;
		}

		return [point[0] - 1, point[1]];
	}

	function moveUp(point) {
		
		// If we can't move up
		if ( !inGrid(point[1] - 1, point[0]) ||
			grid[point[1] - 1][point[0]] === ~~!currentColor ) {

			return false;
		}

		return [point[0], point[1] - 1];
	}

	// Get the next position by finding the nearest barrier, and moving
	// accordingly.
	function getNextPosition(polygon) {
		var neighbors = []
			, n = 0
			, directionResult = false;

		// Set the neighbors array. These are the blocks that share a
		// point with the line cursor.
		neighbors[0] = [lineCursor[0], lineCursor[1] - 1]; 		// Top
		neighbors[1] = [lineCursor[0], lineCursor[1]];			// Right
		neighbors[2] = [lineCursor[0]-1, lineCursor[1]];		// Bottom
		neighbors[3] = [lineCursor[0]-1, lineCursor[1]-1];		// Left

		if ( isCheckerd(lineCursor) ) {
			if ( prevDirection === 0 ) {
				prevDirection = 1;
				return directionMap[1](lineCursor);
			} else if ( prevDirection === 1 ) {
				prevDirection = 2;
				return directionMap[2](lineCursor);
			} else if ( prevDirection === 2 ) {
				prevDirection = 3;
				return directionMap[3](lineCursor);
			} else if ( prevDirection === 3 ) {
				prevDirection = 0;
				return directionMap[0](lineCursor);
			}
		}

		for ( n; n < 4; n += 1 ) {
			// Neighbor is outside grid row bounds.
			if ( (neighbors[n][1] > (gridRows - 1) || neighbors[n][1] < 0) 
				// Neighbor is outside grid column bounds.
				|| (neighbors[n][0] > (gridCols - 1) ||
					neighbors[n][0] < 0) ) {

				directionResult = directionMap[n](lineCursor);

				if ( directionResult ) {
					prevDirection = n;
					return directionResult;
				}

			} else {

				if ( grid[neighbors[n][1]][neighbors[n][0]] ===
					~~!currentColor ) {
					
					directionResult = directionMap[n](lineCursor);

					if ( directionResult ) {
						prevDirection = n;
						return directionResult;
					}
				}

			}
		}

	}


	/*
	 * Illustrator Methods
	 */

	function getIllustratorPoints(points, size) {
		var p = 0
			, numPoints = points.length
			, illPoints = [];

		for ( p; p < numPoints; p += 1 ) {

			// If the point is on the same line as the previous and next
			// points, then we don't need it.
			if ( p > 0 && p < (numPoints - 1) ) {
				p = parseInt(p);
				if ( (points[p+1][0] === points[p][0] && points[p-1][0] === points[p][0])
					|| (points[p+1][1] === points[p][1] && points[p-1][1] === points[p][1]) ) {

					continue;
				}
			}

			illPoints.push(
				[(points[p][0] * size), ((points[p][1] * size * -1) + illDocument.height)]
			);
		}

		// Remove the extraneous last point
		illPoints.pop();

		return illPoints;
	}

	function drawPath(points, color, doc) {
		var newPath = doc.pathItems.add()
			, fill = new GrayColor();

		newPath.setEntirePath(points);

		newPath.stroked = false;
		newPath.filled = true;
		fill.gray = ~~color * 100;
		newPath.fillColor = fill;

		newPath.closed = true;
	}
};

/*
 * Script Entry Point
 */

var qr = new QRCode(-1, QRErrorCorrectLevel.H)
	, IllQR = new IllustratorQR()

	, windowRes = "dialog { text:'Illustrator QR', \
					 dataGroup: Group {\
						label1: StaticText { text:'QR Data',\
							properties:{multiline:false}\
						},\
						qrData: EditText { text:'', characters: 30,\
							properties:{multiline:false}\
						},\
						alignment:['left','top']\
					 },\
					 sizeGroup: Group {\
						label1: StaticText { text:'QR Size (in inches)',\
							properties:{multiline:false}\
						},\
						qrSize: EditText { text:'2', characters: 22,\
							properties:{multiline:false}\
						},\
						alignment:['left','top']\
					 },\
					 btnGroup: Group {\
					 	alignment:'right', \
					 	okBtn: Button { text:'OK', },\
					 	cancelBtn: Button { text:'Cancel', }\
					 }\
				}"

	, win = new Window(windowRes)
	, qrData = ''
	, qrSize = 144;


win.btnGroup.okBtn.onClick = function() {
	qrData = win.dataGroup.qrData.text;
	qrSize = parseInt(win.sizeGroup.qrSize.text) * 72

	if ( qrData !== '' ) {
		win.close();
		
		qr.addData( qrData);
		qr.make();

		IllQR.init( qr.modules, app.documents.add(DocumentColorSpace.CMYK, qrSize, qrSize) );
		IllQR.make( (qrSize / qr.modules.length) );

	} else {
		alert('You must fill in the "QR Data" field.')
	}
}

win.show();