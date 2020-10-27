# For halding the web request
import requests
# For interpreting the response
from bs4 import BeautifulSoup as bs
# For getting the arguments from the calling function
import sys
print("weather.py - Start!")
# In case we want to debug, this will default to "Chicago"
city = sys.argv[1]
print("weather.py - City: " + str(city))
# The function being run
def get_weather(place):
    # Default string to return if call fails
    weather = "nothing"
    # Replace spaces with -
    place = place.replace(" ", "-")
    # Construct the URL we're going to use
    url = "https://www.weather-forecast.com/locations/" + place + "/forecasts/latest"
    # Do a GET call to the URL
    r = requests.get(url)
    # Process the response as an "lxml" file
    soup = bs(r.content, "lxml")
    # Search the response for a specific class
    weather = soup.findAll("span", {"class": "phrase"})[0].text
    # Return the weather string
    return weather

# This will send a 'message' back to the JS function.
# We call the above function and whatever is returned is sent.
print("ALERT - " + get_weather(city))
# Clear out memory
sys.stdout.flush()
print("weather.py - End!")



