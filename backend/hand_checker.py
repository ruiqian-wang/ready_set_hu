from typing import List, Tuple, Dict, Optional
from collections import Counter
from .models import CheckHandResponse

def parse_hand(tiles: List[str]) -> List[str]:
    """Sorts tiles to make checking easier."""
    # Custom sort order: sort by suit (wan < tong < tiao), then by rank
    # This ensures consistent ordering for sequences
    def tile_sort_key(t: str) -> tuple:
        if t.endswith("wan"):
            return (0, int(t[:-3]))
        elif t.endswith("tong"):
            return (1, int(t[:-4]))
        elif t.endswith("tiao"):
            return (2, int(t[:-4]))
        else:
            return (3, t)  # Unknown format, sort alphabetically
    return sorted(tiles, key=tile_sort_key)

def is_pair(tiles: List[str]) -> bool:
    return len(tiles) == 2 and tiles[0] == tiles[1]

def is_triplet(tiles: List[str]) -> bool:
    return len(tiles) == 3 and tiles[0] == tiles[1] == tiles[2]

def is_sequence(tiles: List[str]) -> bool:
    if len(tiles) != 3:
        return False
    
    # Parse tile format: "{rank}{suit}" where suit is "wan", "tong", or "tiao"
    # e.g., "1wan", "2tong", "3tiao"
    try:
        parsed = []
        for t in tiles:
            # Extract suit (last 3-4 characters: "wan", "tong", "tiao")
            if t.endswith("wan"):
                rank = int(t[:-3])
                suit = "wan"
            elif t.endswith("tong"):
                rank = int(t[:-4])
                suit = "tong"
            elif t.endswith("tiao"):
                rank = int(t[:-4])
                suit = "tiao"
            else:
                return False  # Unknown format
            parsed.append((rank, suit))

        # Check if same suit
        suits = [s for _, s in parsed]
        if len(set(suits)) != 1:
            return False

        # Check if consecutive ranks
        ranks = [r for r, _ in parsed]
        ranks.sort()
        return ranks[0] + 1 == ranks[1] and ranks[1] + 1 == ranks[2]
    except (ValueError, IndexError):
        return False  # Honor tiles or invalid format

def check_standard_win(counts: Counter) -> Optional[Dict]:
    """
    Recursive backtracking to find 4 melds + 1 pair.
    We assume a standard 14-tile hand (after draw).
    """
    
    # find a pair first
    # Create a list of potential pair candidates to avoid runtime error during iteration
    candidates = [t for t, c in counts.items() if c >= 2]
    
    for tile in candidates:
        if counts[tile] >= 2:
            # Remove pair
            counts[tile] -= 2
            if counts[tile] == 0:
                del counts[tile]
                
            # Check for remaining 4 melds (12 tiles)
            melds = []
            if solve_melds(counts, melds):
                return {"pair": [tile, tile], "melds": melds}
            
            # Backtrack: put pair back
            counts[tile] += 2
            
    return None

def solve_melds(counts: Counter, melds: List[List[str]]) -> bool:
    if sum(counts.values()) == 0:
        return True
    
    # Pick the first available tile to try and form a meld with
    first_tile = sorted(counts.keys())[0]
    
    # Try Triplet
    if counts[first_tile] >= 3:
        counts[first_tile] -= 3
        if counts[first_tile] == 0:
            del counts[first_tile]
        
        melds.append([first_tile] * 3)
        if solve_melds(counts, melds):
            return True
        
        # Backtrack
        melds.pop()
        counts[first_tile] += 3
        
    # Try Sequence
    # Can only form sequence if it's a number tile
    try:
        # Parse tile format: "{rank}{suit}" where suit is "wan", "tong", or "tiao"
        if first_tile.endswith("wan"):
            rank = int(first_tile[:-3])
            suit = "wan"
        elif first_tile.endswith("tong"):
            rank = int(first_tile[:-4])
            suit = "tong"
        elif first_tile.endswith("tiao"):
            rank = int(first_tile[:-4])
            suit = "tiao"
        else:
            raise ValueError("Not a numbered tile")
        
        t1 = first_tile
        t2 = f"{rank+1}{suit}"
        t3 = f"{rank+2}{suit}"
        
        if counts[t1] >= 1 and counts[t2] >= 1 and counts[t3] >= 1:
            counts[t1] -= 1
            counts[t2] -= 1
            counts[t3] -= 1
            
            # Cleanup zeros
            if counts[t1] == 0: del counts[t1]
            if counts[t2] == 0: del counts[t2]
            if counts[t3] == 0: del counts[t3]
            
            melds.append([t1, t2, t3])
            if solve_melds(counts, melds):
                return True
                
            # Backtrack
            melds.pop()
            counts[t1] += 1
            counts[t2] += 1
            counts[t3] += 1
            
    except (ValueError, IndexError):
        pass # Not a number tile or invalid format
        
    return False

def check_hand(tiles: List[str]) -> CheckHandResponse:
    # usually 14 tiles
    if len(tiles) % 3 != 2:
         return CheckHandResponse(
            is_win=False,
            message="Invalid tile count. A winning hand usually has 14 tiles (e.g., 13 + 1 drawn)."
        )
    
    # Sort for consistency
    sorted_tiles = parse_hand(tiles)
    counts = Counter(sorted_tiles)
    
    result = check_standard_win(counts)
    
    if result:
        return CheckHandResponse(
            is_win=True,
            message=f"Winning hand! Found pair {result['pair'][0]} and {len(result['melds'])} melds.",
            detail=result
        )
    else:
         return CheckHandResponse(
            is_win=False,
            message="Not a winning hand yet."
        )

