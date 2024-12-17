package vehicles;

public class Car extends Vehicle{
    public Car(String model, String license, String color, int year, String ownerName, String insuranceNumber) {
        super(model,license, color, year, ownerName,insuranceNumber);
        this.engineType = "Combustion";
    }

    @Override
    public String vehicleType(){
        return "Car";
    }

    @Override
    public String toString() {
        return "Vehicle Type: " + vehicleType() + "\n" +
                "Model: " + getModel() + "\n" +
                "License: " + getLicense() + "\n" +
                "Color: " + getColor() + "\n" +
                "Year: " + getYear() + "\n" +
                "Owner Name: " + getOwnerName() + "\n" +
                "Insurance Number: " + getInsuranceNumber() + "\n" +
                "Engine Type: " + getEngineType();
    }


}
