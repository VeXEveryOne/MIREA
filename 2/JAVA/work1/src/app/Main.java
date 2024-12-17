package app;

import vehicles.Car;
import vehicles.electricCar;

public class Main {
    public static void main(String[] args) {
        Car car = new Car();
        electricCar car2 = new electricCar();

        car.setOwnerName("Ilya");
        car.setEngineType("Diesel");
        car.setInsuranceNumber(2131277008);

        car2.setOwnerName("Dima");
        car2.setEngineType("Electric");
        car2.setInsuranceNumber(573423156);

        System.out.println("Car class output");
        System.out.println("------------------------------------------------");
        System.out.println("Owner name: " + car.getOwnerName() + "\nInsurance number: " + car.getInsuranceNumber() + "\nEngine type: " + car.getEngineType() + "\nBattery capacity: " + car.getBatteryCapacity());
        System.out.println("------------------------------------------------");
        System.out.println("ElectricCar class output");
        System.out.println("Owner name: " + car2.getOwnerName() + "\nInsurance number: " + car2.getInsuranceNumber() + "\nEngine type: " + car2.getEngineType() + "\nBattery capacity: " + car2.getBatteryCapacity());

    }
}
