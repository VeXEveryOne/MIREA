package vehicles;

public class electricCar extends Car{
    private int batteryCapacity;

    public electricCar()
    {
        this.engineType = "Electric";
    }
    public void setBatteryCapacity(int capacity) {
        this.batteryCapacity = capacity;
    }

    public int getBatteryCapacity() {
        return this.batteryCapacity;
    }
}
