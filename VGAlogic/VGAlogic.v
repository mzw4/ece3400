
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
reg [1:0] pixel_in;
wire [13:0] pixel_r_index;
reg [13:0] pixel_w_index;
wire [1:0] pixel_out;
reg pixel_wen;

reg [9:0] counter; //state variable to draw screen
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

assign pixel_r_index[13:7] = PIXEL_COORD_X[9:3]; //shift by 5 for pixel->block transform
assign pixel_r_index[6:0] = PIXEL_COORD_Y[9:3];

//=======================================================
//  Structural coding
//=======================================================
always @(posedge CLOCK_50) begin
	CLOCK_25 <= ~CLOCK_25; //VGA needs 25 MHz clock - FPGA has 50 MHz clock
	timer <= timer + 1;
	
	if (reset) begin
		counter <= 0; //iterate through all memory locations
		start_draw <= 1'b0;
	end
	else if (button_down && ~start_draw) begin
		// draw square
		pixel_wen <= 1; // write
		
		pixel_w_index <= counter; //location
		//pixel_in <= 2'b00 + (counter[5] ^ counter[0]); //value
		pixel_in <= 2'b00 + counter[0]; //value
			
		if (counter == 10'b11_1111_1111) begin
			//counter_go <= 0; //end of loop
			//pixel_wen <= 0;
			counter = 10'd0 ;
		end
		counter <= counter + 10'd1;
		start_draw = 1'b1;
	end
	else if(button_down && start_draw) begin
		pixel_wen <= 0;
	end
	else if(~button_down) begin
		start_draw = 1'b0;
	end
	
	/*
	if (reset) begin
		counter <= 0; //iterate through all memory locations
		counter_go <= 1;
	end
	else if (counter_go) begin
		pixel_wen <= 1; //write 
		pixel_w_index <= counter; //location
		//pixel_in <= 2'b00 + (counter[5] ^ counter[0]); //value
		if (timer[26]) pixel_in <= {counter[0], counter[5]}; //value
		else pixel_in <= {counter[1], counter[7]}; //value
			
		if (counter == 10'b11_1111_1111) begin
			//counter_go <= 0; //end of loop
			//pixel_wen <= 0;
			counter = 10'd0 ;
		end
		counter <= counter + 10'd1;
	end
	*/
end

assign reset = ~KEY[0];
assign button_down = ~KEY[1];

//translate 2 bit pixel array values to 8 bit RGB
// 8'bGGG_RRR_BB 
assign PIXEL_COLOR = (pixel_out == 2'b00)? 8'b011_011_01 : // brown
							(pixel_out == 2'b01)? 8'b010_110_11 : // cyan
							(pixel_out == 2'b10)? 8'b000_000_01 : // 1/4 blue
							(pixel_out == 2'b11 && PIXEL_COORD_X < 200)? 8'b100_100_01 : // gray
							(pixel_out == 2'b11 && PIXEL_COORD_X < 400)? 8'b111_111_11 : // white
																						8'b111_111_00 ; // yellow

endmodule
