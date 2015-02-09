/*
fft_adc_serial.pde
guest openmusiclabs.com 7.7.14
example sketch for testing the fft library.
it takes in data on ADC0 (Analog0) and processes them
with the fft. the data is sent out over the serial
port at 115.2kb.
*/

#define LOG_OUT 1 // use the log output function
#define FFT_N 256 // set to 256 point fft

#include <FFT.h> // include the library
int pinNumber = A0;
int k;
int whistle = 0;
int whistle_threshold = 40;

void setup() {
  Serial.begin(115200); // use the serial port
}

void loop() {
  while(1) { // reduces jitter
    //cli();  // UDRE interrupt slows this way down on arduino1.0
    for (int i = 0 ; i < 512 ; i += 2) { // save 256 samples
     k = analogRead(pinNumber);
     delayMicroseconds(200);

     fft_input[i] = k; // put real data into even bins
     fft_input[i+1] = 0; // set odd bins to 0
    }
    fft_window(); // window the data for better frequency response
    fft_reorder(); // reorder the data before doing the fft
    fft_run(); // process the data in the fft
    fft_mag_log(); // take the output of the fft
    //sei();
    Serial.println("start");
    for (byte i = 0 ; i < FFT_N/2 ; i++) {
      //if(i > 45 && i < 55) {
        //Serial.println(i);
        Serial.println(fft_log_out[i]); // send out the data
      //}
      if(i == 57 && fft_log_out[i] > whistle_threshold) {
       whistle = 1;
      } else {
       whistle = 0;
      }
    }
  }
}

