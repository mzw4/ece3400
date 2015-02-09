/*
  Blink
  Turns on an LED on for one second, then off for one second, repeatedly.

  Most Arduinos have an on-board LED you can control. On the Uno and
  Leonardo, it is attached to digital pin 13. If you're unsure what
  pin the on-board LED is connected to on your Arduino model, check
  the documentation at http://arduino.cc

  This example code is in the public domain.

  modified 8 May 2014
  by Scott Fitzgerald
 */

#include <Servo.h>

int POTENT_PIN = A0;
int ANALOG_PIN = 10;
int SWITCH_PIN = 3;
int LED_ON = 0;

Servo servo;

// the setup function runs once when you press reset or power the board
void setup() {
  // initialize digital pin 13 as an output.
  pinMode(10, OUTPUT);
  pinMode(3, INPUT_PULLUP);
  servo.attach(9);
  
  Serial.begin(9600);
}

// the loop function runs over and over again forever
void loop() {
  /*
  digitalWrite(10, HIGH);   // turn the LED on (HIGH is the voltage level)
  delay(1000);              // wait for a second
  digitalWrite(10, LOW);    // turn the LED off by making the voltage LOW
  delay(1000);              // wait for a second
  */
  delay(100);
  if(digitalRead(SWITCH_PIN) == LOW) {
    LED_ON = ~LED_ON;
  }
  
  int analog_in = analogRead(POTENT_PIN);
  if(LED_ON) {
    //Serial.println(analog_in);
    analogWrite(ANALOG_PIN, int(analog_in/4));
  } else {
    analogWrite(ANALOG_PIN, 0);
  }
  
  servo.write(int(analog_in/5.683));
}
