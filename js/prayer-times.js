/**
 * Prayer Times Module
 * Fetches and displays Islamic prayer times using Aladhan API
 */

class PrayerTimes {
  constructor() {
    this.prayerTimes = null;
    this.location = null;
    this.currentTime = null;
    this.nextPrayer = null;
    this.timeToNextPrayer = null;
    this.marqueeElement = null;
    this.updateInterval = null;
  }

  /**
   * Initialize the prayer times module
   */
  async init() {
    this.marqueeElement = document.getElementById("prayer-times-marquee");
    if (!this.marqueeElement) {
      console.error("Prayer times marquee element not found");
      return;
    }

    try {
      // Get user's location
      await this.getLocation();

      // Fetch prayer times
      await this.fetchPrayerTimes();

      // Update display
      this.updateDisplay();

      // Set up interval to update current time and next prayer
      this.updateInterval = setInterval(() => {
        this.updateDisplay();
      }, 1000); // Update every second
    } catch (error) {
      console.error("Error initializing prayer times:", error);
      this.showError();
    }
  }

  /**
   * Get user's geolocation
   */
  async getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          this.location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          // Get city name using reverse geocoding
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${this.location.latitude}&lon=${this.location.longitude}`,
            );
            const data = await response.json();
            this.location.city =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              data.address.county ||
              "Unknown";
            this.location.country = data.address.country || "Unknown";
          } catch (error) {
            console.warn("Could not get city name:", error);
            this.location.city = "Unknown";
            this.location.country = "Unknown";
          }

          resolve(this.location);
        },
        (error) => {
          // Default to Jakarta if geolocation fails
          console.warn(
            "Geolocation failed, using default location (Jakarta):",
            error,
          );
          this.location = {
            latitude: -6.2088,
            longitude: 106.8456,
            city: "Jakarta",
            country: "Indonesia",
          };
          resolve(this.location);
        },
      );
    });
  }

  /**
   * Fetch prayer times from Aladhan API
   */
  async fetchPrayerTimes() {
    const today = new Date();
    const date = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const url = `https://api.aladhan.com/v1/timings/${date}-${month}-${year}?latitude=${this.location.latitude}&longitude=${this.location.longitude}&method=20`; // Method 20: Kemenag (Indonesia)

    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 200 && data.data) {
      this.prayerTimes = {
        Fajr: data.data.timings.Fajr,
        Dhuhr: data.data.timings.Dhuhr,
        Asr: data.data.timings.Asr,
        Maghrib: data.data.timings.Maghrib,
        Isha: data.data.timings.Isha,
      };
    } else {
      throw new Error("Failed to fetch prayer times");
    }
  }

  /**
   * Calculate time to next prayer
   */
  calculateNextPrayer() {
    if (!this.prayerTimes) return null;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const prayers = [
      { name: "Fajr", time: this.prayerTimes.Fajr },
      { name: "Dhuhr", time: this.prayerTimes.Dhuhr },
      { name: "Asr", time: this.prayerTimes.Asr },
      { name: "Maghrib", time: this.prayerTimes.Maghrib },
      { name: "Isha", time: this.prayerTimes.Isha },
    ];

    // Convert prayer times to minutes
    const prayerMinutes = prayers.map((prayer) => {
      const [hours, minutes] = prayer.time.split(":").map(Number);
      return {
        name: prayer.name,
        time: prayer.time,
        minutes: hours * 60 + minutes,
      };
    });

    // Find next prayer
    let nextPrayer = null;
    for (const prayer of prayerMinutes) {
      if (prayer.minutes > currentTime) {
        nextPrayer = prayer;
        break;
      }
    }

    // If no next prayer found today, use Fajr tomorrow
    if (!nextPrayer) {
      nextPrayer = prayerMinutes[0];
      const minutesUntilMidnight = 24 * 60 - currentTime;
      this.timeToNextPrayer = minutesUntilMidnight + nextPrayer.minutes;
    } else {
      this.timeToNextPrayer = nextPrayer.minutes - currentTime;
    }

    this.nextPrayer = nextPrayer;
    return nextPrayer;
  }

  /**
   * Format time to next prayer
   */
  formatTimeToNextPrayer() {
    if (this.timeToNextPrayer === null) return "";

    const hours = Math.floor(this.timeToNextPrayer / 60);
    const minutes = this.timeToNextPrayer % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Format current date
   */
  formatDate() {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  /**
   * Format current time
   */
  formatCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }

  /**
   * Update the marquee display
   */
  updateDisplay() {
    if (!this.marqueeElement) return;

    this.currentTime = this.formatCurrentTime();
    const currentDate = this.formatDate();
    this.calculateNextPrayer();

    const locationText = `${this.location.city}, ${this.location.country}`;
    const timeToNext = this.formatTimeToNextPrayer();
    const nextPrayerName = this.nextPrayer ? this.nextPrayer.name : "Unknown";

    // Build the marquee content - all on one line for proper spacing
    const content = `<span class="prayer-item"><span class="prayer-label">📍</span> <span class="prayer-value">${locationText}</span></span> <span class="prayer-separator">•</span> <span class="prayer-item"><span class="prayer-label">📅</span> <span class="prayer-value">${currentDate}</span></span> <span class="prayer-separator">•</span> <span class="prayer-item"><span class="prayer-label">🕐 Current Time:</span> <span class="prayer-value">${this.currentTime}</span></span> <span class="prayer-separator">•</span> <span class="prayer-item"><span class="prayer-label">⏰ Next Prayer:</span> <span class="prayer-value">${nextPrayerName} (${timeToNext})</span></span> <span class="prayer-separator">•</span> <span class="prayer-item"><span class="prayer-label">🌅 Fajr:</span> <span class="prayer-value">${this.prayerTimes?.Fajr || "--:--"}</span></span> <span class="prayer-separator">•</span> <span class="prayer-item"><span class="prayer-label">☀️ Dhuhr:</span> <span class="prayer-value">${this.prayerTimes?.Dhuhr || "--:--"}</span></span> <span class="prayer-separator">•</span> <span class="prayer-item"><span class="prayer-label">🌤️ Asr:</span> <span class="prayer-value">${this.prayerTimes?.Asr || "--:--"}</span></span> <span class="prayer-separator">•</span> <span class="prayer-item"><span class="prayer-label">🌅 Maghrib:</span> <span class="prayer-value">${this.prayerTimes?.Maghrib || "--:--"}</span></span> <span class="prayer-separator">•</span> <span class="prayer-item"><span class="prayer-label">🌙 Isha:</span> <span class="prayer-value">${this.prayerTimes?.Isha || "--:--"}</span></span> <span class="prayer-separator">•</span> `;

    // Duplicate content for seamless looping
    this.marqueeElement.innerHTML = content + content;

    // Set consistent scroll speed across all screen sizes
    this.setScrollSpeed();
  }

  /**
   * Set scroll speed based on content width for consistent speed across screen sizes
   */
  setScrollSpeed() {
    const pixelsPerSecond = 15; // ADJUST THIS VALUE: lower = slower (e.g., 30), higher = faster (e.g., 100)
    
    // Get the actual width of the marquee content
    const contentWidth = this.marqueeElement.scrollWidth / 2; // Divide by 2 because content is duplicated
    
    // Calculate duration: width / speed
    const duration = contentWidth / pixelsPerSecond;
    
    // Apply the animation with calculated duration
    this.marqueeElement.style.animation = `scroll ${duration}s linear infinite`;
  }

  /**
   * Show error message
   */
  showError() {
    if (!this.marqueeElement) return;
    this.marqueeElement.innerHTML = `
      <span class="prayer-error">Unable to load prayer times. Please check your connection.</span>
    `;
  }

  /**
   * Clean up intervals
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    const prayerTimes = new PrayerTimes();
    prayerTimes.init();
  });
} else {
  const prayerTimes = new PrayerTimes();
  prayerTimes.init();
}

// Export for potential use in other modules
export { PrayerTimes };