package work6;

public interface BikeParts {
    String getHandleBars();
    void setHandleBars(String handleBars);
    String getFrame();
    void setFrame(String frame);
    String getTyres();
    void setTyres(String tyres);
    String getSeatType();
    void setSeatType(String seatType);
    int getNumGears();
    void setNumGears(int numGears);
    String getMake();
    final String make = "BikeByDeath";
}
