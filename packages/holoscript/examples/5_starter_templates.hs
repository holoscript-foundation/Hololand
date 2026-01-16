// 5 Starter Template Worlds in HoloScript

// Template 1: Welcome Plaza
ZONE welcome_plaza {
  position: (0, 0, 0)
  
  ENTITY info_pillar {
    position: (0, 1, 0)
    model: "pillars/stone_pillar.glb"
    scale: (1.5, 2, 1.5)
    
    ON_CLICK {
      SHOW_DIALOG("Welcome to Hololand", {
        title: "Welcome to Hololand",
        message: "Create amazing VR experiences for your audience",
        buttons: [
          { label: "Creator Guide", action: "NAVIGATE:/docs/creator" },
          { label: "Close", action: "CLOSE_DIALOG" }
        ]
      })
    }
  }
  
  ENTITY welcome_sign {
    position: (0, 2.5, 0)
    model: "signs/neon_welcome.glb"
    ON_HOVER {
      PLAY_SOUND("ambient/magic_chime.mp3")
    }
  }
  
  ENTITY floor {
    position: (0, -0.5, 0)
    shape: sphere
    radius: 20
    color: "#4F46E5"
  }
  
  // Portals to other zones
  ENTITY portal_to_casino {
    position: (-8, 1, -10)
    model: "portals/casino_portal.glb"
    scale: (2, 3, 2)
    
    ON_CLICK {
      SHOW_DIALOG("Enter Casino World?", {
        buttons: [
          { label: "Enter", action: "NAVIGATE:/worlds/casino" },
          { label: "Cancel", action: "CLOSE_DIALOG" }
        ]
      })
    }
  }
  
  ENTITY portal_to_shop {
    position: (8, 1, -10)
    model: "portals/shop_portal.glb"
    scale: (2, 3, 2)
    
    ON_CLICK {
      SHOW_DIALOG("Enter Builder Shop?", {
        buttons: [
          { label: "Enter", action: "NAVIGATE:/worlds/builder-shop" },
          { label: "Cancel", action: "CLOSE_DIALOG" }
        ]
      })
    }
  }
}

// Template 2: Retail Shop
ZONE retail_shop {
  position: (0, 0, 0)
  
  ENTITY shop_counter {
    position: (0, 0, -5)
    model: "furniture/shop_counter.glb"
    scale: (3, 1.5, 2)
  }
  
  ENTITY product_shelf_1 {
    position: (-5, 1, 0)
    model: "furniture/shelf_unit.glb"
    
    ON_CLICK {
      SHOW_DIALOG("Featured Items", {
        items: [
          { name: "Deluxe Avatar Skin", price: "$9.99" },
          { name: "VIP Access Pass", price: "$19.99" }
        ],
        buttons: [
          { label: "Purchase", action: "BUY_ITEM" },
          { label: "Close", action: "CLOSE_DIALOG" }
        ]
      })
    }
  }
  
  ENTITY product_shelf_2 {
    position: (5, 1, 0)
    model: "furniture/shelf_unit.glb"
    
    ON_CLICK {
      SHOW_DIALOG("More Items", {
        items: [
          { name: "Premium Emote Pack", price: "$4.99" },
          { name: "World Pass Bundle", price: "$29.99" }
        ]
      })
    }
  }
  
  ENTITY floor {
    position: (0, -0.5, 0)
    shape: box
    size: (20, 0.5, 20)
    color: "#FFFFFF"
  }
  
  ENTITY ambient_light_1 {
    position: (-5, 5, 5)
    type: light
    color: "#FFDD88"
    intensity: 0.8
  }
  
  ENTITY ambient_light_2 {
    position: (5, 5, -5)
    type: light
    color: "#88DDFF"
    intensity: 0.8
  }
}

// Template 3: Game Arena
ZONE game_arena {
  position: (0, 0, 0)
  
  ENTITY game_pedestal_1 {
    position: (-10, 0, 0)
    model: "game_machines/arcade_cabinet.glb"
    
    ON_CLICK {
      PLAY_SOUND("arcade/start_game.mp3")
      SHOW_MESSAGE("Loading Mini-Game...", { duration: 2 })
      NAVIGATE("/mini-games/trivia")
    }
  }
  
  ENTITY game_pedestal_2 {
    position: (0, 0, 0)
    model: "game_machines/puzzle_station.glb"
    
    ON_CLICK {
      PLAY_SOUND("arcade/puzzle_start.mp3")
      NAVIGATE("/mini-games/puzzle")
    }
  }
  
  ENTITY game_pedestal_3 {
    position: (10, 0, 0)
    model: "game_machines/shooter_cabinet.glb"
    
    ON_CLICK {
      PLAY_SOUND("arcade/shooter_start.mp3")
      NAVIGATE("/mini-games/shooter")
    }
  }
  
  ENTITY leaderboard {
    position: (0, 3, -10)
    model: "displays/holographic_display.glb"
    scale: (4, 2, 0.5)
    
    ON_CLICK {
      SHOW_DIALOG("Leaderboard", {
        leaders: [
          { rank: 1, name: "Player1", score: 9850 },
          { rank: 2, name: "Player2", score: 9420 },
          { rank: 3, name: "Player3", score: 8950 }
        ]
      })
    }
  }
  
  ENTITY floor {
    position: (0, -0.5, 0)
    shape: box
    size: (30, 0.5, 20)
    color: "#1A1A2E"
  }
}

// Template 4: Art Gallery
ZONE art_gallery {
  position: (0, 0, 0)
  
  ENTITY wall_left {
    position: (-10, 2, 0)
    shape: box
    size: (1, 6, 20)
    color: "#F5F5F5"
  }
  
  ENTITY wall_right {
    position: (10, 2, 0)
    shape: box
    size: (1, 6, 20)
    color: "#F5F5F5"
  }
  
  ENTITY painting_1 {
    position: (-9.5, 2.5, -8)
    model: "art/framed_painting_1.glb"
    scale: (2, 2.5, 0.2)
    
    ON_CLICK {
      SHOW_DIALOG("Artwork: Nebula Dreams", {
        artist: "CreatorName",
        price: "$49.99",
        description: "An abstract journey through space and time",
        buttons: [
          { label: "Buy Print", action: "BUY_ITEM" },
          { label: "View NFT", action: "NAVIGATE:/nft/painting-1" }
        ]
      })
    }
  }
  
  ENTITY painting_2 {
    position: (-9.5, 2.5, 0)
    model: "art/framed_painting_2.glb"
    scale: (2, 2.5, 0.2)
    
    ON_CLICK {
      SHOW_DIALOG("Artwork: Digital Horizon", {
        artist: "CreatorName",
        price: "$39.99"
      })
    }
  }
  
  ENTITY painting_3 {
    position: (-9.5, 2.5, 8)
    model: "art/framed_painting_3.glb"
    scale: (2, 2.5, 0.2)
    
    ON_CLICK {
      SHOW_DIALOG("Artwork: Synthwave City", {
        artist: "CreatorName",
        price: "$44.99"
      })
    }
  }
  
  ENTITY floor {
    position: (0, -0.5, 0)
    shape: box
    size: (20, 0.5, 20)
    color: "#E8E8E8"
  }
  
  ENTITY spotlight_1 {
    position: (-9, 5, -8)
    type: light
    color: "#FFFFFF"
    intensity: 1.5
  }
  
  ENTITY spotlight_2 {
    position: (-9, 5, 0)
    type: light
    color: "#FFFFFF"
    intensity: 1.5
  }
  
  ENTITY spotlight_3 {
    position: (-9, 5, 8)
    type: light
    color: "#FFFFFF"
    intensity: 1.5
  }
}

// Template 5: Conference Room
ZONE conference_room {
  position: (0, 0, 0)
  
  ENTITY meeting_table {
    position: (0, 0.8, 0)
    model: "furniture/conference_table.glb"
    scale: (6, 0.8, 3)
  }
  
  ENTITY chair_1 {
    position: (-2, 0.5, 1)
    model: "furniture/office_chair.glb"
  }
  
  ENTITY chair_2 {
    position: (0, 0.5, 1)
    model: "furniture/office_chair.glb"
  }
  
  ENTITY chair_3 {
    position: (2, 0.5, 1)
    model: "furniture/office_chair.glb"
  }
  
  ENTITY presentation_screen {
    position: (0, 2, -5)
    model: "displays/conference_screen.glb"
    scale: (5, 3, 0.2)
    
    ON_CLICK {
      SHOW_DIALOG("Presentation Mode", {
        buttons: [
          { label: "Start Slideshow", action: "PRESENTATION_START" },
          { label: "Share Screen", action: "SCREENSHARE" }
        ]
      })
    }
  }
  
  ENTITY recording_indicator {
    position: (0, 3.5, -4.8)
    model: "indicators/recording_light.glb"
    color: "#FF0000"
  }
  
  ENTITY wall_front {
    position: (0, 2, -6)
    shape: box
    size: (10, 5, 0.5)
    color: "#2C3E50"
  }
  
  ENTITY wall_back {
    position: (0, 2, 6)
    shape: box
    size: (10, 5, 0.5)
    color: "#34495E"
  }
  
  ENTITY floor {
    position: (0, -0.5, 0)
    shape: box
    size: (12, 0.5, 14)
    color: "#ECF0F1"
  }
  
  ENTITY ceiling_light {
    position: (0, 5, 0)
    type: light
    color: "#FFFFFF"
    intensity: 1.0
  }
}
