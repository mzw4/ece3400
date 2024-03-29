//=======================================================
//  This code is generated by Terasic System Builder
//=======================================================

//THIS PROJECT DEVELOPED BY CORNELL ECE 3400 STAFF. PLEASE
//DO NOT REUSE OR DISTRIBUTE THIS CODE WITHOUT PERMISSION
//SPRING 2015

module VGAlogic(

	//////////// CLOCK //////////
	CLOCK_50,

	//////////// KEY //////////
	KEY,

	////// GPIO_0, GPIO_0 connect to GPIO Default //////
	GPIO,
	GPIO_IN
);


//=======================================================
//  PORT declarations
//=======================================================

//////////// CLOCK //////////
input 		          		CLOCK_50;

//////////// KEY //////////
input 		     [1:0]		KEY;

///// GPIO_0, GPIO_0 connect to GPIO Default //////////
inout 		    [33:0]		GPIO;
input 		     [1:0]		GPIO_IN;


//=======================================================
//  REG/WIRE declarations
//=======================================================
reg CLOCK_25;
wire [9:0] PIXEL_COORD_X;
wire [9:0] PIXEL_COORD_Y;
wire [7:0] PIXEL_COLOR;

wire reset;
wire button_down;
reg [1:0] pixel_in;
wire [13:0] pixel_r_index;
reg [13:0] pixel_w_index;
wire [1:0] pixel_out;
reg pixel_wen;

reg new_input;
reg drawing_grid;
reg drawing_wall;
reg [4:0] counter_x; //state variable to draw screen
reg [4:0] counter_y;
reg [4:0] square_x; // grid square on the top left corner
reg [4:0] square_y;
reg [2:0] grid_x;
reg [2:0] grid_y;
reg [3:0] wall_locations;
reg [1:0] wall_index;
reg [3:0] i;

// multiplication
reg [2:0] ax;
reg [2:0] ay;
reg [4:0] outx;
reg [4:0] outy;

reg counter_go; //counter enable
reg [31:0] timer ; // slow screen update

reg start_draw;

VGADriver driver(
	.CLOCK(CLOCK_25),
	.PIXEL_COLOR_IN(PIXEL_COLOR),
	.PIXEL_X(PIXEL_COORD_X),
	.PIXEL_Y(PIXEL_COORD_Y),
	.PIXEL_COLOR_OUT({GPIO[9],GPIO[11],GPIO[13],GPIO[15],GPIO[17],GPIO[19],GPIO[21],GPIO[23]}),
	.H_SYNC_NEG(GPIO[7]),
	.V_SYNC_NEG(GPIO[5])
);

blockArray pixelArray(
	.reset(reset),
	.clk(CLOCK_50),
	.r_index(pixel_r_index),
	.w_index(pixel_w_index),
	.value(pixel_in),
	.w_en(pixel_wen),
	.out(pixel_out)
);

/*
mult multx(
	.a(ax),
	.b(3'd6),
	.clk(CLOCK_50),
	.out(outx)
);
mult multy(
	.a(ay),
	.b(3'd6),
	.clk(CLOCK_50),
	.out(outy)
);*/

assign pixel_r_index[9:5] = PIXEL_COORD_X[7:3]; //shift by 5 for pixel->block transform
assign pixel_r_index[4:0] = PIXEL_COORD_Y[7:3];

//=======================================================
//  Structural coding
//=======================================================
always @(posedge CLOCK_50) begin
	CLOCK_25 <= ~CLOCK_25; //VGA needs 25 MHz clock - FPGA has 50 MHz clock
	timer <= timer + 1;
	
	// set grid start location in terms of pixel squares
	if (grid_x == 3'd0) begin
		square_x = 5'd1;
	end
	else if (grid_x == 3'd1) begin
		square_x = 5'd7;
	end
	else if (grid_x == 3'd2) begin
		square_x = 5'd13;
	end
	else if (grid_x == 3'd3) begin
		square_x = 5'd19;
	end
	else if (grid_x == 3'd4) begin
		square_x = 5'd25;
	end
	if (grid_y == 3'd0) begin
		square_y = 5'd1;
	end
	else if (grid_y == 3'd1) begin
		square_y = 5'd7;
	end
	else if (grid_y == 3'd2) begin
		square_y = 5'd13;
	end
	else if (grid_y	== 3'd3) begin
		square_y = 5'd19;
	end
	
	if(new_input) begin
		// start drawing grid square
		counter_x <= square_x;
		counter_y <= square_y;
		drawing_grid = 1'b1;
	end
	else if(drawing_grid) begin
		if (counter_x == square_x + 5'b00101) begin
			//finished drawing grid
			drawing_grid = 0;
			
			// start drawing walls
			wall_index = 0;
			drawing_wall = 1'b1;
			
			// set counter to first wall location
			counter_x = square_x - 1'b1;
			counter_y = square_y - 1'b1;
		end
		else begin
			// draw the current grid pixel
			pixel_wen <= 1; // write
			pixel_w_index <= {counter_x, counter_y}; //location
			pixel_in <= 2'b01; // assign color value to square
			
			counter_y <= counter_y + 5'd1;
			if (counter_y == square_y + 5'b00100) begin
				counter_y <= square_y;				// reset Y coordinate to 0
				counter_x <= counter_x + 1'b1;	// increment X coordinate
			end
		end
	end
	else if(drawing_wall) begin
		// only draw the wall if there is a wall there
		// but always increment the counter so we can get to all the wall locations
		
		if(wall_locations[wall_index] == 1'b1) begin
			pixel_wen <= 1; // write
			pixel_w_index <= {counter_x, counter_y}; //location
			pixel_in <= 2'b10; // assign color value to square
		end
		
		// increment or decrement x or y depending on which wall you are drawing
		if(wall_index == 2'b00) begin
			// north wall
			counter_x <= counter_x + 1'b1;
			if (counter_x == square_x + 5'b00100) begin
				wall_index = wall_index + 1'b1;
			end
		end
		else if(wall_index == 2'b01) begin
			// east wall
			counter_y <= counter_y + 1'b1;
			if (counter_y == square_y + 5'b00100) begin
				wall_index = wall_index + 1'b1;
			end
		end
		else if(wall_index == 2'b10) begin
			// south wall
			counter_x <= counter_x - 1'b1;
			if (counter_x == square_x - 1'b0) begin
				wall_index = wall_index + 1'b1;
			end
		end
		else if(wall_index == 2'b11) begin
			// west wall
			counter_y <= counter_y - 1'b1;
			if (counter_y == square_y - 1'b0) begin
				drawing_wall = 0;
			end
		end
	end
	
	if (reset) begin
		counter_x <= 0; //iterate through all memory locations
		counter_y <= 0;
		start_draw <= 1'b0;
		
		drawing_wall <= 0;
		drawing_grid <= 0;
		
		grid_x <= 0;
		grid_y <= 0;
	end
	else if (button_down && ~start_draw) begin
		// draw square
		start_draw = 1'b1;
		new_input = 1'b1;
		
		wall_locations = 4'b0011;
		
		grid_x <= grid_x + 1'b1;
		if (grid_x == 3'b00101) begin
			grid_x <= 0;
			grid_y <= grid_y + 1'b1;
		end
	end
	else if(button_down && start_draw) begin
		pixel_wen <= 0;
	end
	else if(~button_down) begin
		start_draw = 1'b0;
		new_input = 1'b0;
	end
end

assign reset = ~KEY[0];
assign button_down = ~KEY[1];

//translate 2 bit pixel array values to 8 bit RGB
// 8'bGGG_RRR_BB 
assign PIXEL_COLOR = (pixel_out == 2'b00)? 8'b011_011_01 : // brown
							(pixel_out == 2'b01)? 8'b010_110_11 : // cyan
							(pixel_out == 2'b10)? 8'b111_010_01 : // pink?
							(pixel_out == 2'b11 && PIXEL_COORD_X < 200)? 8'b100_100_01 : // gray
							(pixel_out == 2'b11 && PIXEL_COORD_X < 400)? 8'b111_111_11 : // white
																						8'b111_111_00 ; // yellow

endmodule

