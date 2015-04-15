'use strict';
/*global $:false */
/*global console:false */
/*global Handlebars */

// ==================== Simulation Properties ====================

var _num_simulations = 100;
var _delay = 10;
var _silent = false;
var _manual = false;

// ==================== Maze Properties ====================
var Dir = {
  N: 'N',
  E: 'E',
  S: 'S',
  W: 'W',
};

var WIDTH = 5;
var HEIGHT = 4;

var edge_probabilities = {
  0: 0.9,
  1: 0.3,
  2: 0.3,
};

var _maze = [];

// ==================== Robot Properties ====================

var START_Y = 3;
var START_X = 0;
var INITIAL_DIR = Dir.E;

var ISLAND_DISTANCE_THRESHOLD = 3;

var _all_algorithms = ['prioritize_smart_islands', 'prioritize_smart', 'random_norepeat_smart', 'random_norepeat', 'random'];

var _algorithms = ['prioritize_smart_islands'];
var _robot = {};

// ==================== Drawing vars ====================

var cell_template, wall_template, option_template, alg_select_template;
var i, j;
var $maze_panel, $generate_button, $move_button, $start_button, $stop_button,
  $startx_input, $starty_input, $dir_input, $alg_input, $delay_input, $num_sims_input,
  $e1p, $e2p, $e3p, $output_panel, $silent_input, $delay_value, $progress_bar, $sim_info;

// ==================== Main ====================

$(function() {
  // ------------------- Init elements -------------------

  $sim_info = $('#simulation_info');
  $maze_panel = $('#maze_panel');
  $output_panel = $('#output_panel');

  $generate_button = $('#generate_button');
  $move_button = $('#move_button');
  $start_button = $('#start_button');
  $stop_button = $('#stop_button');

  $startx_input = $('#startx_input');
  $starty_input = $('#starty_input');
  $dir_input = $('#dir_input');
  $alg_input = $('#alg_input');
  $num_sims_input = $('#num_sims_input');
  $delay_input = $('#delay_input');
  $delay_value = $('#delay_value');
  $silent_input = $('#silent_input');
  $progress_bar = $('#progress_bar');

  $e1p = $('#edge1');
  $e2p = $('#edge2');
  $e3p = $('#edge3');

  // Handlebars templates
  cell_template = Handlebars.compile($('#cell_template').html());
  wall_template = Handlebars.compile($('#wall_template').html());
  option_template = Handlebars.compile($('#option_template').html());
  alg_select_template = Handlebars.compile($('#alg_select_template').html());

  // populate default input values
  $startx_input.val(START_X);
  $starty_input.val(START_Y);

  Object.keys(Dir).forEach(function(dir) {
    $dir_input.append(option_template({ value: dir }));
  });
  $dir_input.val(INITIAL_DIR);

  _all_algorithms.forEach(function(alg) {
    $alg_input.append(alg_select_template({ algorithm: alg }));
  });

  $e1p.val(edge_probabilities[0]);
  $e2p.val(edge_probabilities[1]);
  $e3p.val(edge_probabilities[2]);

  $delay_input.val(_delay);
  $delay_value.html($delay_input.val());
  $num_sims_input.val(_num_simulations);
  $silent_input.prop('checked', _silent);

  $('#prioritize_smart_islands_checkbox').prop('checked', true);

  // ------------------- Event callbacks -------------------
  $generate_button.on('click', function(event) {
    event.preventDefault();
    stop_sim();
    initSim();
  });

  $move_button.on('click', function(event) {
    event.preventDefault();
    _manual = true;
    doMoves();
  });

  $start_button.on('click', function(event) {
    event.preventDefault();
    if(!running) {
      start_sim();
    } else {
      paused = !paused;
    }
  });

  $stop_button.on('click', function(event) {
    event.preventDefault();
    stop_sim();
  });

  $delay_input.on('input', function(event) {
    event.preventDefault();
    _delay = $delay_input.val();
    $delay_value.html(_delay);
  });

  $num_sims_input.on('change', function(event) {
    event.preventDefault();
    _num_simulations = $num_sims_input.val();
  });

  _all_algorithms.forEach(function(alg) {
    $('#' + alg + '_checkbox').on('change', function(event) {
      event.preventDefault();
      if($(this).is(":checked")) {
        _algorithms.push(alg);
      } else {
        _algorithms.remove(alg);
      }
    });
  });

  $silent_input.on('change', function(event) {
    event.preventDefault();
    _silent = $silent_input.is(":checked");
    if(_silent) {
      _delay = 0;
      $delay_input.val(_delay);
      $delay_value.html(_delay);
    }
  });

  $e1p.on('change', function(event) {
    event.preventDefault();
    edge_probabilities[0] = $e1p.val();
  }); 
  $e2p.on('change', function(event) {
    event.preventDefault();
    edge_probabilities[1] = $e2p.val();
  });
  $e3p.on('change', function(event) {
    event.preventDefault();
    edge_probabilities[2] = $e3p.val();
  }); 

  // ------------------- Simulator logic -------------------

  var avg_moves = 0.0;
  var sim_count = 0.0;
  var running = false;
  var paused = false;

  var cur_algorithm;
  var startx;
  var starty;
  var start_dir;
  // var algorithm;
  var start_time;

  var algorithm_stats = {};
  _all_algorithms.forEach(function(algorithm) {
    algorithm_stats[algorithm] = {};
  });

  function doMoves() {
    if(!_manual && !running) return;

    var done = false;
    if(!paused) {
      done = performRobotStep();
    }

    if(!done && !_manual) {
      setTimeout(function () {
        doMoves();
      }, _delay);
    } else if(done) {
      show_output('Maze ' + sim_count + ': ' + _robot.algorithm + ' finished. Total moves: ' + _robot.moves);

      // Update avg moves
      if(!('avg_moves' in algorithm_stats[_robot.algorithm])) {
        algorithm_stats[_robot.algorithm].avg_moves = 0;
      }
      algorithm_stats[_robot.algorithm].avg_moves =
        ((algorithm_stats[_robot.algorithm].avg_moves * sim_count) + _robot.moves)/(sim_count+1);

      // Update avg deviation from max efficiency
      if(!('avg_deviation' in algorithm_stats[_robot.algorithm])) {
        algorithm_stats[_robot.algorithm].avg_deviation = 0;
      }
      if(!('deviation_count' in algorithm_stats[_robot.algorithm])) {
        algorithm_stats[_robot.algorithm].deviation_count = 0;
      }
      if(!('max_deviation' in algorithm_stats[_robot.algorithm])) {
        algorithm_stats[_robot.algorithm].max_deviation = 0;
      }
      var num_visited = getNumVisitedMaze();
      if(num_visited <= _robot.moves) {
        var count = algorithm_stats[_robot.algorithm].deviation_count;
        var deviation = _robot.moves - num_visited;
        algorithm_stats[_robot.algorithm].avg_deviation =
          ((algorithm_stats[_robot.algorithm].avg_deviation * count) + deviation)/(count+1);
        algorithm_stats[_robot.algorithm].deviation_count++;
        algorithm_stats[_robot.algorithm].max_deviation = Math.max(deviation, algorithm_stats[_robot.algorithm].max_deviation);
      }

      // Decide next action
      cur_algorithm = cur_algorithm + 1;
      if(cur_algorithm < _algorithms.length) {  // simulate this maze for next algorithm
        resetSimulation(startx, starty, start_dir, _algorithms[cur_algorithm])
        doMoves();
      } else if(sim_count < _num_simulations) { // simulate the next maze
        sim_count++;
        cur_algorithm = 0;
        initSimulation(startx, starty, start_dir, _algorithms[cur_algorithm]);
        $progress_bar.css({ width: (sim_count*100/_num_simulations) + '%' });
        doMoves();
      } else {  // we're done, report stats
        _algorithms.forEach(function(algorithm) {
          show_output('==========' + algorithm);
          show_output('Simulations: ' + sim_count);
          show_output('Avg moves: ' + algorithm_stats[algorithm].avg_moves);
          show_output('Max efficiency deviation count: ' + algorithm_stats[algorithm].deviation_count);
          show_output('Avg deviation: ' + algorithm_stats[algorithm].avg_deviation);
          show_output('Max deviation: ' + algorithm_stats[algorithm].max_deviation);
        });
        show_output('==========');
        show_output('Total simulation time: ' + ((new Date()).getTime() - start_time)/1000 + ' seconds');
        running = false;
      }
      var runtime = ((new Date()).getTime() - start_time)/1000;
      $sim_info.html("Simulating Maze: " + sim_count + ' (' + (sim_count*100/_num_simulations) + '%, ' +
        (runtime / (sim_count/_num_simulations) - runtime).toFixed(2) + ' sec remaining)' +
        '<br>Algorithm: ' + _algorithms[cur_algorithm]);
    }
  }

  function start_sim() {
    _manual = false;
    if(initSim()) {
      running = true;
      doMoves();      
    }
  }

  function stop_sim() {
    running = false;
    paused = false;
  }

  function setParameters() {
    startx = parseInt($startx_input.val());
    starty = parseInt($starty_input.val());
    start_dir = $dir_input.val();
    // algorithm = $alg_input.val();
    cur_algorithm = 0;
    // algorithm = _algorithms[cur_algorithm];
    sim_count = 0;
  }

  function initSimulation(startx, starty, start_dir, algorithm) {
    $sim_info.html("Simulating Maze: " + sim_count + ' (' + (sim_count*100/_num_simulations) + '%, N/A sec remaining)' +
      '<br>Algorithm: ' + _algorithms[cur_algorithm]);    makeMaze(startx, starty);
    initRobot(startx, starty, start_dir, algorithm);
    drawMaze();
    drawRobot(_robot);
  }

  function resetSimulation(startx, starty, start_dir, algorithm) {
    resetMaze();
    initRobot(startx, starty, start_dir, algorithm);
  }

  function initSim() {
    start_time = (new Date()).getTime();
    $progress_bar.css({ width: (sim_count*100/_num_simulations) + '%' });

    setParameters();
    if(_algorithms.length == 0) {
      show_output("No algorithm selected! Select an algorithm and regenerate the maze.");
      return false;
    }
    initSimulation(startx, starty, start_dir, _algorithms[cur_algorithm]);
    return true;
  }

  function performRobotStep() {
    var done = moveRobot();
    if(!_silent) {
      drawMaze();
      drawRobot(_robot);
    }
    return done;
  }

});

function show_output(msg) {
  $output_panel.append('<div>' + msg + '</div>');
  $output_panel.scrollTop($output_panel[0].scrollHeight);
}

// ============================= MAZE LOGIC =============================

function resetMaze() {
  _maze.forEach(function(row, y) {
    row.forEach(function(cell, x) {
      cell.visited = false;
    });
  });
}

function makeMaze(startx, starty) {
  generateMaze(startx, starty);
}

var visited = {};

/**
 * Generate a random maze
 */
function generateMaze(startx, starty) {
  // init maze array
  for(i = 0; i < HEIGHT; i++) {
    _maze[i] = [];
    for(j = 0; j < WIDTH; j++) {
      _maze[i].push({
        'outgoing': [],
        'visited': false
      });
    }
  }

  visited = {};
  generateMazeRecurse(startx, starty, null);
}

function generateMazeRecurse(x, y, prev_dir) {
  var cur_point = { x: x, y: y };
  if(pointToString(cur_point) in visited) {
    // console.log('already visited');
    return;
  }
  // console.log('Recursing on point: ' + cur_point.y + ' ' + cur_point.x);

  visited[pointToString(cur_point)] = true;
  var possible = getChildren(x, y, prev_dir);
  var edge_count = 0;

  if(!_maze[y][x]) {
    _maze[y][x] = {};
  }
  if(!_maze[y][x].outgoing) {
    _maze[y][x].outgoing = {};
  }
  // _maze[y][x].visited = true;
  // _maze[y][x].coords = y + '' + x;

  // iterate through possibles in random order
  // probability of an edge gets lower with each edge
  while(possible.length > 0) {
    var index = Math.floor(Math.random() * possible.length);
    var point = possible[index];

    // add an edge to the neighbor with a certain probability
    if(Math.random() < edge_probabilities[edge_count]) {
      // console.log('Adding ' + point.y + ' ' + point.x);
      // add the edge
      _maze[y][x].outgoing[pointToString(point)] = true;
      // also add an edge in the opposite direction for easier interpretation later
      if(!_maze[point.y][point.x]) {
        _maze[point.y][point.x] = {};
      }
      if(!_maze[point.y][point.x].outgoing) {
        _maze[point.y][point.x].outgoing = {};
      }
      _maze[point.y][point.x].outgoing[pointToString(cur_point)] = true;

      edge_count++;
      generateMazeRecurse(point.x, point.y, point.prev_dir);
    }
    possible.splice(index, 1);
  }
}

function getChildren(x, y, prev_dir) {
  var possible = [];
  for(var d in Dir) {
    if (prev_dir && Dir[d] === prev_dir) continue; // don't evaluate direction we came from
    var point = getPointInDir(x, y, Dir[d]);
    if (checkBounds(point)) {
      // console.log(point.y + '' + point.x);
      possible.push(point);
    }
  }
  return possible;
}

function getPointInDir(x, y, dir) {
  x = parseInt(x);
  y = parseInt(y);
  switch(dir) {
    case Dir.N: return {x: x, y: y-1, prev_dir: reverseDir(dir)};
    case Dir.E: return {x: x+1, y: y, prev_dir: reverseDir(dir)};
    case Dir.S: return {x: x, y: y+1, prev_dir: reverseDir(dir)};
    case Dir.W: return {x: x-1, y: y, prev_dir: reverseDir(dir)};
  }
}

function reverseDir(dir) {
  switch(dir) {
    case Dir.N: return Dir.S;
    case Dir.E: return Dir.W;
    case Dir.S: return Dir.N;
    case Dir.W: return Dir.E;
  }
  return null;
}

function checkBounds(point) {
  return point.x >= 0 && point.x < WIDTH && point.y >= 0 && point.y < HEIGHT;
}

function getWall(cellx, celly, dir) {
  if(!_maze[celly][cellx] || !_maze[celly][cellx].outgoing) return true;
  var outgoing = _maze[celly][cellx].outgoing;
  var point = getPointInDir(cellx, celly, dir);
  return !(pointToString(point) in outgoing);
}

function drawMaze() {
  $maze_panel.empty();

  // create maze divs
  _maze.forEach(function(row, y) {
    var $row_cells = $('<tr></tr>');
    var $row_h_walls = $('<tr></tr>');

    $row_cells.append(wall_template({ wall_type: 'v_wall', present: 'present'}));
    $row_h_walls.append('<td class="corner"</td>');

    row.forEach(function(cell, x) {
      // console.log(y + ' ' + x);
      // console.log(_maze[y][x].outgoing);
      $row_cells.append(cell_template({ explored: _maze[y][x].visited? 'explored': '', x: x, y: y }));

      // draw east walls
      var wall = getWall(x, y, Dir.E);
      $row_cells.append(wall_template({ wall_type: 'v_wall', present: wall? 'present': _maze[y][x].visited? 'explored': ''}));

      // draw south walls
      wall = getWall(x, y, Dir.S);
      $row_h_walls.append(wall_template({ wall_type: 'h_wall', present: wall? 'present': _maze[y][x].visited? 'explored': '' }));
      $row_h_walls.append('<td class="corner"></td>');
    });

    if(y === 0) {
      var $top_wall = $('<tr></tr>');
      $top_wall.append('<td class="corner"></td>');
      row.forEach(function() {
        $top_wall.append(wall_template({ wall_type: 'h_wall', present: 'present' }));
        $top_wall.append('<td class="corner"></td>');
      });
      $maze_panel.append($top_wall);
    }
    $maze_panel.append($row_cells);
    $maze_panel.append($row_h_walls);
  });
}

function updateDrawMaze(point) {
  $maze_panel.find('[data-index="' + point.y + point.x + '"]').addClass('explored');
}

function pointToString(point) {
  return point.y + '' + point.x;
}

function stringToPoint(str) {
  return { x: parseInt(str.charAt(1)), y: parseInt(str.charAt(0)) };
}

function getNumVisitedMaze() {
  var sum = 0;
  _maze.forEach(function(row) {
    row.forEach(function(cell) {
      if(cell.visited) sum++;
    });
  });
  return sum;
}

// ============================= ROBOT LOGIC =============================

function initRobot(x, y, dir, algorithm) {
  var explored = {};
  explored[y+''+x] = true;
  _maze[y][x].visited = true;
  _robot = {x: x, y: y, dir: dir,
    explored: explored,
    path: [],
    moves: 0,
    algorithm: algorithm, 
  };
}

function drawRobot(robot) {
  $maze_panel.find('.robot').remove();
  var $cell = $maze_panel.find('.cell[data-index="' + robot.y + robot.x + '"]');
  $cell.append('<image src="wall-e.png" class="robot">');

  updateDrawMaze({x: robot.x, y: robot.y});
}

/**
 * Moves the robot one step based on the selected algorithm
 * Returns true if the robot has no moves left
 */
function moveRobot() {
  var outgoing = _maze[_robot.y][_robot.x].outgoing;
  outgoing = Object.keys(outgoing);

  var index, unexplored, unexplored_frontier, path;
  var move = null;
  switch(_robot.algorithm) {
    case 'random':
      index = Math.floor(Math.random() * outgoing.length);
      move = stringToPoint(outgoing[index]);
      break;
    case 'random_norepeat':
      unexplored = outgoing.filter(function(point) {
        return !(point in _robot.explored);
      });
      if(unexplored.length === 0) break; 
      index = Math.floor(Math.random() * unexplored.length);
      move = stringToPoint(unexplored[index]);
      break;
    case 'random_norepeat_smart':
      if(_robot.path && _robot.path.length > 0) {
        move = stringToPoint(_robot.path[0]);
        _robot.path.splice(0, 1);
      }

      unexplored = outgoing.filter(function(point) {
        return !(point in _robot.explored);
      });

      if(unexplored.length === 0) {
        // find unexplored areas
        unexplored_frontier = findUnexplored();
        if(unexplored_frontier.length === 0) {
          break;
        }

        // navigate to nearest unexplored location
        path = findClosestPath(unexplored_frontier);
        path.splice(0, 1);
        if(path.length > 0) {
          move = stringToPoint(path[0]);
          path.splice(0, 1);
          if(path.length > 0) {
            _robot.path = path;
          }
        }
      } else {
        // pick a random direction to move in
        index = Math.floor(Math.random() * unexplored.length);
        move = stringToPoint(unexplored[index]);
      }
      break;
    case 'prioritize_smart':
      if(_robot.path && _robot.path.length > 0) {
        move = stringToPoint(_robot.path[0]);
        _robot.path.splice(0, 1);
      }

      unexplored = outgoing.filter(function(point) {
        return !(point in _robot.explored);
      });

      if(unexplored.length === 0) {
        // find unexplored areas
        unexplored_frontier = findUnexplored();
        if(unexplored_frontier.length === 0) {
          break;
        }

        // navigate to nearest unexplored location
        path = findClosestPath(unexplored_frontier);
        path.splice(0, 1);
        if(path.length > 0) {
          move = stringToPoint(path[0]);
          path.splice(0, 1);
          if(path.length > 0) {
            _robot.path = path;
          }
        }
      } else {
        // prioritize left movements
        [Dir.N, Dir.E, Dir.S, Dir.W].reverse().forEach(function(dir) {
          var point = getPointInDir(_robot.x, _robot.y, dir);
          if(unexplored.indexOf(pointToString(point)) > -1) {
            move = {x: point.x, y: point.y };
          }
        });
      }
      break;
    case 'prioritize_smart_islands':
      if(_robot.path && _robot.path.length > 0) {
        move = stringToPoint(_robot.path[0]);
        _robot.path.splice(0, 1);
        break;
      }

      unexplored = outgoing.filter(function(point) {
        return !(point in _robot.explored);
      });

      // check for islands
      var path_to_island = findPathToIsland(_robot.x, _robot.y, ISLAND_DISTANCE_THRESHOLD)

      if(path_to_island != null && path_to_island.length > 0) {
        path_to_island.splice(0, 1);
        if(path_to_island.length > 0) {
            move = stringToPoint(path_to_island[0]);
          path_to_island.splice(0, 1);
          _robot.path = path_to_island;
        }
      } else if(unexplored.length === 0) {
        // find unexplored areas
        unexplored_frontier = findUnexplored();
        if(unexplored_frontier.length === 0) {
          break;
        }

        // navigate to nearest unexplored location
        path = findClosestPath(unexplored_frontier);
        path.splice(0, 1);
        if(path.length > 0) {
          move = stringToPoint(path[0]);
          path.splice(0, 1);
          _robot.path = path;
        }
      } else {
        // prioritize left movement
        [Dir.N, Dir.E, Dir.S, Dir.W].reverse().forEach(function(dir) {
          var point = getPointInDir(_robot.x, _robot.y, dir);
          if(unexplored.indexOf(pointToString(point)) > -1) {
            move = {x: point.x, y: point.y };
          }
        });
      }
      break;
    default:
      console.log('Algorithm not recognized.');
      return true;
  }

  if(move && !allExplored()) {
    _robot.moves++;
    _robot.x = move.x;
    _robot.y = move.y;
    _robot.explored[move.y + '' + move.x] = true;
    _maze[move.y][move.x].visited = true;
    return false;
  } else {
    return true;
  }
}

/**
 * Checks that all explorable portions of the maze have been visited
 * Returns true if the frontier of unexplored nodes is empty
 */
function allExplored() {
  return findUnexplored().length == 0;
}

/**
 * Looks through explored locations for any edges to unexplored locations
 * returns a list of possible unexplored locations
 */
function findUnexplored() {
  var unexplored = [];
  Object.keys(_robot.explored).forEach(function (loc) {
    var point = stringToPoint(loc);
    for(var maze_loc in _maze[point.y][point.x].outgoing) {
      if(!(maze_loc in _robot.explored)) {
        unexplored.push(stringToPoint(maze_loc));
      }
    }
  });
  return unexplored;
}

/**
 * Return the path to the closest unexplored location,
 * or null if there are no unexplored locations
 */
function findClosestPath(unexplored) {
  var min_path = null;
  unexplored.forEach(function(loc) {
    var path = astar(_robot.x, _robot.y, loc.x, loc.y);
    if(!min_path || path.length < min_path.length) {
      min_path = path;
    }
  });
  return min_path;
}

// Finds islands that are within a certain distance from the given location
// If an island is found, returns the path to that island
function findPathToIsland(start_x, start_y, max_dist) {
  // search maze for islands
  var result_path = []
  _maze.forEach(function(row, y) {
    row.forEach(function(cell, x) {
      var island = true;
      Object.keys(Dir).forEach(function(dir) {
        var point = getPointInDir(x, y, dir)
        // if there is a neighbor that is not visited and there is no wall, this cell is not an island
        if(cell.outgoing.length == 0 ||
            pointToString(point) in cell.outgoing && !_maze[point.y][point.x].visited) {
          island = false;
        }
      });
      if(!cell.visited && island) {
        // check the distance
        var path = astar(start_x, start_y, x, y);
        if(path.length <= max_dist) {
          // return path to the island
          result_path = path;
        }
      }
    });
  });
  return result_path;
}

// ============================= PATHFINDING =============================

/**
 * A* Search algorithm
 * Returns the optimal path
 */
function astar(startx, starty, endx, endy) {
  var visited = {};
  var frontier = [];
  frontier.push({
    x: startx,
    y: starty,
    g: 0,
    f: dist(startx, startx, endx, endy),
    parent: null
  });

  var current;
  while (frontier.length > 0) {
    var index = findClosest(frontier);
    current = frontier[index];

    if(current.x === endx && current.y === endy) {
      //done, reconstruct path
      return reconstruct(current);
    }

    // remove node from frontier and set node as visited
    frontier.splice(index, 1);
    visited[current.y+''+current.x] = true;

    // evaluate neighbors
    var neighbors = _maze[current.y][current.x].outgoing;
    for(var loc in neighbors) {
      if(loc in visited) continue;

      var g = current.g + 1;  // each location is only 1 away from another

      var point = stringToPoint(loc);
      frontier.push({
        x: point.x,
        y: point.y,
        g: g,
        f: g + dist(point.x, point.y, endx, endy),
        parent: current
      });
    }
  }

  function dist(x, y, endx, endy) {
    return Math.abs(parseFloat(x)-parseFloat(endx)) + Math.abs(parseFloat(y)-parseFloat(endy));
  }

  function findClosest(frontier) {
    var closest_i = 0;
    var closest = null;
    for(var i = 0; i < frontier.length; i++) {
      var node = frontier[i];
      if(!closest || node.f < closest.f) {
        closest = node;
        closest_i = i;
      }
    }
    return closest_i;
  }

  function reconstruct(end_node) {
    var path = [];
    var cur_node = end_node;
    while(cur_node) {
      path.push(cur_node.y+''+cur_node.x);
      cur_node = cur_node.parent;
    }
    return path.reverse();
  }

  return null;
}


