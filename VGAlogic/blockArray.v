//THIS PROJECT DEVELOPED BY CORNELL ECE 3400 STAFF. PLEASE
//DO NOT REUSE OR DISTRIBUTE THIS CODE WITHOUT PERMISSION
//SPRING 2015

`define ARRAY_SIZE 16383

module blockArray (
	reset,
	clk,
	r_index,
	w_index,
	value,
	w_en,
	out
);

input reset;
input clk;
input [9:0] r_index; //x&y coords
input [9:0] w_index; //x&y coords
input [1:0] value; //write value
input w_en; //write enable
output [1:0] out; //gives r_index's value

reg [1:0] array[1023:0]; //data array
reg [1:0] pre_out; //since out value is a wire

reg[9:0] i;

always @(posedge clk) begin
	if (reset) begin
	  array[i] <= 2'b00;
	  i <= i + 1;
	  	if (i == `ARRAY_SIZE) begin
			i <= 0;
		end
	end
	
	if (w_en == 1) begin //write value
		array[w_index] <= value;
	end
	pre_out <= array[r_index]; // can use M9K
end

assign out = pre_out; // can use M9K
//assign out = array[r_index]; // forces logic memory
endmodule

