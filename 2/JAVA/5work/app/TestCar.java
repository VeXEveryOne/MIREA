package app;

import vehicles.Car;
import vehicles.ElectricCar;

public class TestCar{
    public static void main(String[] args) {
        Car RS6 = new Car("Audi RS6", "В004КО.13", "Grey", 2019, "Albahtin", "42587032");
        ElectricCar SU7 = new ElectricCar("Xiaomi SU7 ultra", "o013oo.13", "Blue", 2024, "Albahtin", "57425245", 100);

        RS6.setOwnerName("Albahtin");
        RS6.setYear(2017);

        SU7.setInsuranceNumber("62367565");
        SU7.setLicense("o887oo.78");

        System.out.println(RS6.toString());
        System.out.println("---------------------------------");
        System.out.println(SU7.toString());
    }
}
