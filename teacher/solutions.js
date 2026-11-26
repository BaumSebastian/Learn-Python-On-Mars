/* Sample solutions (three stars each). Only loaded when the page is opened as index.html?teacher
 * Delete this folder on the student PCs if you do not want the solutions to be there. */
window.SOLUTIONS = {
  'how-far':
    'for k in range(3):\n    n = distance()\n    for i in range(n):\n        move_right()\n    collect()\n',

  'code-word':
    'code = ""\nfor i in range(5):\n    move_right()\n    code = code + read()\nunlock(code)\nmove_right()\nmove_right()\ncollect()\n',

  'right-or-down':
    'for i in range(10):\n    if can_move_right():\n        move_right()\n    else:\n        move_down()\ncollect()\n',

  'heli-order':
    'order = get_order()\nfor i in range(0, len(order), 2):\n    n = int(order[i])\n    for k in range(n):\n        if order[i + 1] == "R":\n            fly_right()\n        else:\n            fly_down()\nmark()\n',

  'heli-bugs':
    'def fly_to(x, y):\n    while get_x() < x:\n        fly_right()\n    while get_x() > x:\n        fly_left()\n    while get_y() < y:\n        fly_down()\n    while get_y() > y:\n        fly_up()\n\nphoto = take_photo()\ntargets = []\nfor y in range(len(photo)):\n    for x in range(len(photo[y])):\n        if photo[y][x] == "ice":\n            targets.append([x, y])\n\nfor t in targets:\n    fly_to(t[0], t[1])\n    mark()\n',

  'first-contact':
    'move_right()\nmove_right()\nmove_right()\ncollect()\n',

  'detour':
    'move_right()\nmove_right()\nmove_down()\nmove_right()\nmove_right()\nmove_down()\ncollect()\n',

  'long-road':
    'for i in range(10):\n    move_right()\ncollect()\n',

  'ice-row':
    'for i in range(6):\n    move_right()\n    collect()\n',

  'staircase':
    'for i in range(4):\n    move_down()\n    move_right()\n    collect()\n',

  'corner':
    'for i in range(5):\n    move_right()\n    collect()\nfor i in range(3):\n    move_down()\n    collect()\n',

  'big-field':
    'for row in range(4):\n    for i in range(4):\n        move_right()\n        collect()\n    for i in range(4):\n        move_left()\n    move_down()\n',

  'look-first':
    'for i in range(9):\n    move_right()\n    if is_sample():\n        collect()\n',

  'storm-field':
    'for row in range(3):\n    for i in range(5):\n        move_right()\n        if is_sample():\n            collect()\n    for i in range(5):\n        move_left()\n    move_down()\n',

  'unknown':
    'while can_move_right():\n    move_right()\n    if is_sample():\n        collect()\n',

  'canyon':
    'for i in range(2):\n    while can_move_right():\n        move_right()\n    while can_move_down():\n        move_down()\ncollect()\n',

  'own-commands':
    'def collect_row():\n    for i in range(4):\n        move_right()\n        collect()\n    for i in range(4):\n        move_left()\n\ncollect_row()\nmove_down()\nmove_down()\ncollect_row()\nmove_down()\nmove_down()\nmove_down()\ncollect_row()\n',

  'ice-or-stone':
    'for i in range(9):\n    move_right()\n    if is_sample("ice"):\n        collect()\n',

  'pyramid':
    'for n in range(1, 6):\n    for i in range(n):\n        move_right()\n        collect()\n    for i in range(n):\n        move_left()\n    move_down()\n',

  'heli-delivery':
    'for i in range(5):\n    fly_right()\nfor i in range(2):\n    fly_up()\ndrop()\n',

  'heli-moving-target':
    'fly_up()\nfly_up()\nfor i in range(3):\n    wait()\ndrop()\n',

  'heli-photo':
    'photo = take_photo()\nfor y in range(len(photo)):\n    for x in range(len(photo[y])):\n        if photo[y][x] == "ice":\n            for i in range(x):\n                fly_right()\n            for i in range(y):\n                fly_down()\n            mark()\n',

  'heli-plan':
    'plan = get_plan()\nfor i in range(plan[0] + plan[2]):\n    fly_right()\nfor i in range(5 - plan[1]):\n    fly_up()\ndrop()\n',

  'heli-route':
    'photo = take_photo()\nfor y in range(len(photo)):\n    if photo[y][4] == "sand":\n        gap = y\nroute = []\nfor i in range(gap):\n    route.append("down")\nfor i in range(8):\n    route.append("right")\nfor i in range(gap):\n    route.append("up")\nsend(route)\n',

  'heli-battery':
    'def fly_to(x, y):\n    while get_x() < x:\n        fly_right()\n    while get_x() > x:\n        fly_left()\n    while get_y() < y:\n        fly_down()\n    while get_y() > y:\n        fly_up()\n\ndef distance(t):\n    return abs(t[0] - get_x()) + abs(t[1] - get_y())\n\nphoto = take_photo()\ntargets = []\nfor y in range(len(photo)):\n    for x in range(len(photo[y])):\n        if photo[y][x] == "ice":\n            targets.append([x, y])\n\nwhile len(targets) > 0:\n    best = targets[0]\n    for t in targets:\n        if distance(t) < distance(best):\n            best = t\n    fly_to(best[0], best[1])\n    mark()\n    targets.remove(best)\n',

  'heli-thermal':
    'heat = take_thermal()\nbest_x = 0\nbest_y = 0\nfor y in range(len(heat)):\n    for x in range(len(heat[y])):\n        if heat[y][x] < heat[best_y][best_x]:\n            best_x = x\n            best_y = y\nfor i in range(best_x):\n    fly_right()\nfor i in range(best_y):\n    fly_down()\nmark()\n',

  'heli-mosaic':
    'area = []\nfor y in range(6):\n    area.append(["sand"] * 9)\n\ndef copy_photo():\n    tile = take_photo()\n    for dy in range(3):\n        for dx in range(3):\n            area[get_y() - 1 + dy][get_x() - 1 + dx] = tile[dy][dx]\n\ncopy_photo()\nfor i in range(2):\n    for j in range(3):\n        fly_right()\n    copy_photo()\nfor j in range(3):\n    fly_down()\ncopy_photo()\nfor i in range(2):\n    for j in range(3):\n        fly_left()\n    copy_photo()\nsend(area)\n',

  'free-exploration':
    'count = 0\nfor row in range(7):\n    for i in range(9):\n        move_right()\n        if scan() == "ice":\n            collect()\n            count = count + 1\n    for i in range(9):\n        move_left()\n    if can_move_down():\n        move_down()\nprint(count)\n'
};
