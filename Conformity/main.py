import pygame
import math
from random import randint, choice
import sys
from dode import Dode, make_computer

pygame.init()

w, h = 1300, 850

#Colors
black = (0,0,0)
white = (255,255,255)
red = (255,0,0)
green = (0,255,0)
blue = (0,0,255)


screen = pygame.display.set_mode((w,h))
pygame.display.set_caption("Conformity")

clock = pygame.time.Clock()


player = Dode(200,200,white)

computer_players = make_computer(100, w, h)
all_dodes = [dode for dode in computer_players]
all_dodes.append(player)

def run():
    running = True
    while running:
        #EVENT HANDLING
        events =sys_events()
        for event in events:
            if event.type == pygame.QUIT:
                running = False
        
        #GAME LOGIC
        player_movement(player, events)
        for computer_player in computer_players:
            computer_movement(computer_player)
        bump_dodes(all_dodes)
        
        
        
        #DRAW ON SCREEN
        screen.fill(black)
        player.draw(screen)
        for computer_player in computer_players:
            computer_player.draw(screen)
        
        #UPDATE SCREEN
        pygame.display.flip()
        clock.tick(60)
    
    pygame.quit()
    sys.exit()

def sys_events():
    return pygame.event.get()
def computer_movement(player: Dode):
    if player.wait_time > 0:
        player.wait_time -= 1
        return
    if (player.x, player.y) == (player.target_x, player.target_y):
        player.move_to(randint(0, w), randint(0, h))
        player.wait(randint(0,4))
    player.move()

def player_movement(player: Dode, events):
    if player.wait_time > 0:
        player.wait_time -= 1
        return
    if (player.x, player.y) == (player.target_x, player.target_y):
        for event in events:
            if event.type == pygame.MOUSEBUTTONUP:
                mouse_x,mouse_y = pygame.mouse.get_pos()
                player.move_to(mouse_x,mouse_y)
    player.move()


def bump_dodes(dodes: list[Dode]):
    for i, dode1 in enumerate(dodes):
        for j in range(i+1, len(dodes)):
            dode1.bump(dodes[j])

if __name__ == "__main__":
    run()

