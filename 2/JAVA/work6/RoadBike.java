package work6;

public class RoadBike extends Bike implements RoadParts{
    private int tyreWidth;
    private int postHeight;

    public RoadBike() {
        this("drop", "racing", "tread less", "razor", 19, 20, 20);
    }

    public RoadBike(int postHeight) {
        this("drop", "racing", "tread less", "razor", 19, 20, postHeight);
    }

    public RoadBike(String handleBars, String frame, String tyres, String seatType, int numGears, int tyreWidth, int postHeight) {
        super(handleBars, frame, tyres, seatType, numGears);
        this.tyreWidth = tyreWidth;
        this.postHeight = postHeight;
    }

    public void setTyreWidth(int tyreWidth) {
        this.tyreWidth = tyreWidth;
    }

    public int getTyreWidth(){
        return this.tyreWidth;
    }

    public void setPostHeight(int postHeight){
        this.postHeight = postHeight;
    }

    public int getPostHeight(){
        return this.postHeight;
    }

    public void printDescription() {
        super.printDescription();
        System.out.println("This Roadbike bike has " + this.tyreWidth + "mm tyres and a post height of " + this.postHeight + ".");
    }
}
