package vehicles;

public class Car {
    private String ownerName;
    private int insuranceNumber;
    protected String engineType;
    private int batteryCapacity;
    public Car(){}

    public Car(String ownerName, int insuranceNumber, String engineType) {
        this.ownerName = ownerName;
        this.insuranceNumber = insuranceNumber;
        this.engineType = engineType;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }

    public int getInsuranceNumber() {
        return insuranceNumber;
    }

    public void setInsuranceNumber(int insuranceNumber) {
        this.insuranceNumber = insuranceNumber;
    }

    public String getEngineType() {
        return engineType;
    }

    public void setEngineType(String engineType) {
        this.engineType = engineType;
    }

    public int getBatteryCapacity() {
        return batteryCapacity;
    }

    public void getBatteryCapacity(int batteryCapacity) {
        this.batteryCapacity = batteryCapacity;
    }

}
