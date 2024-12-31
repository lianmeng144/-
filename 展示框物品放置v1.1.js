/*
 * 该js适用于量子存储（支持单物品取出）及网络合成机 在有展示框 并且 其中有物品 的情况下放置展示物品
 * 支持东西南北上下全方向展示框
 * 使用时最好清空背包，背包中有与量子存储相同的物品会放置失败
 * Producer: Chen_
 * v1.1 增加逻辑：若遇到合成蓝图或者乱序物品时，会自动跳过
 */



// 用于存储展示框的位置
let displayFrames = {};
let me = Player.getPlayer(); // 获取当前玩家对象
let playerLocation = me.getPos(); // 获取玩家当前位置
var LastSyncId = 0

// 检查玩家是否有空的主手背包槽
function empty_main_hand() {
    Player.openInventory().setSelectedHotbarSlotIndex(0) // 选择主手槽

    main_hand_slot = Player.openInventory().getSelectedHotbarSlotIndex() // 获取主手槽索引
    free_slot = Player.openInventory().findFreeInventorySlot() // 查找空的背包槽
    if (free_slot == -1) {
        //Chat.log("背包空间不足") // 如果没有空槽，输出提示
        return false
    }

    // Player.openInventory().openGui() 
    Player.openInventory().swapHotbar(free_slot, main_hand_slot) // 交换背包槽中的物品
    // Player.openInventory().close()
    return true
}

// 打开指定位置的容器
function open_container(x, y, z) {
    //empty_main_hand()
    tick = 0
    MAXTICKS = 10
    while (Player.openInventory().getTotalSlots() < 50) {
        //Chat.log(Player.openInventory().getTotalSlots())
        // 等待打开容器
        me.interactBlock(x, y, z, "up", false) // 与方块顶部交互
        Client.waitTick(1)
        tick++
        if (tick > MAXTICKS) {
            Chat.log("打开容器(" + x + "," + y + "," + z + ")失败：交互距离过远/网络波动")
            return false
        }
    }

    return true
}

function getItemIdBySlot(Index,inventory = Player.openInventory()) {
    var Item = inventory.getSlot(Index)
    var Nbt = Item.getNBT()

    if (Nbt==null) {
        return Item.getItemId()  
    }    
    else {
        if (Nbt.has("PublicBukkitValues")) {
            let PublicBukkitValues = Nbt.get("PublicBukkitValues")
            if(PublicBukkitValues.has("slimefun:slimefun_item")) {
                return "slimefun:"+PublicBukkitValues.get("slimefun:slimefun_item").asString()
            }
            else if(PublicBukkitValues.has("slimefun:slimefun_guide_mode")) {
                return "slimefun:slimefun_guide"
            }
            else{
                return Item.getItemId() 
            }
        }
        else{
            return Item.getItemId() 
        }
    }
}


// 关闭容器c
function close_container(inventory) {
    //empty_main_hand()
    tick = 0
    MAXTICKS = 10
    while (inventory.getTotalSlots() > 50) {
        //Chat.log(inventory.getTotalSlots())
        // 等待关闭容器
        Player.openInventory().close()
        Client.waitTick(1)
        tick++
        if (tick > MAXTICKS) {
            //Chat.log("关闭失败")
            return false
        }
    }

    return true
}

// 将物品从一个槽位移动到另一个槽位
function moveItemFromSlotToSlot(slot1, slot2) {
    Player.openInventory().click(slot1) // 点击第一个槽位
    Player.openInventory().click(slot2, 1) // 将物品放到第二个槽位
    Player.openInventory().click(slot1) // 点击第一个槽位以结束交换
}

// 检索附近的实体并记录展示框信息（排除已有物品的框）
function logNearbyDisplayFrames() {
    let range = 4; // 检测范围，半径4（4x4x4的立方体）
    let nearbyEntities = World.getEntities(); // 获取所有实体

    emp = empty_main_hand() // 检查主手背包槽是否为空
    if (emp == false) {
        Chat.log("背包空间不足") // 如果背包没有空位，输出提示
        return false
    }

    // 遍历所有附近的实体h
    for (let entity of nearbyEntities) {
        let entityPos = entity.getPos(); // 获取实体位置
        let distance = Math.sqrt(
            Math.pow(entityPos.x - playerLocation.x, 2) +
            Math.pow(entityPos.y - playerLocation.y, 2) +
            Math.pow(entityPos.z - playerLocation.z, 2)
        );

        // 检查是否在指定范围内，并且是展示框
        if (distance <= range) {
            let entityType = entity.getType(); // 获取实体类型
            if (entityType === "minecraft:item_frame" || entityType === "minecraft:glow_item_frame") {
                let intPos = `${Math.floor(entityPos.x)}, ${Math.floor(entityPos.y)}, ${Math.floor(entityPos.z)}`; // 获取实体的整数位置

                // 检查展示框是否包含物品
                let item = entity.getItem(); // 获取展示框内的物品
                console.log(item); // 输出物品信息

                // 检查展示框是否为空（包含“minecraft:air”）
                if (String(item).includes("minecraft:air")) { // 确保物品被作为字符串处理
                    displayFrames[intPos] = entityType; // 记录展示框的位置
                    console.log(displayFrames[intPos]); // 输出展示框信息

                    // 将位置字符串分割回 x, y, z 坐标
                    let coords = intPos.split(", "); // 将字符串分割成数组
                    let xFrame = parseInt(coords[0]); // 获取 x 坐标
                    let yFrame = parseInt(coords[1]); // 获取 y 坐标
                    let zFrame = parseInt(coords[2]); // 获取 z 坐标

                    // 根据展示框的朝向调整交互位置
                    pos = entity.getFacingDirection() // 获取展示框的朝向
                    if (String(pos).includes("east")) {
                        res = open_container(xFrame - 1, yFrame, zFrame); // 如果朝东，调整位置
                    }
                    else if (String(pos).includes("west")) {
                        res = open_container(xFrame + 1, yFrame, zFrame); // 如果朝西，调整位置
                    }
                    else if (String(pos).includes("north")) {
                        res = open_container(xFrame, yFrame, zFrame + 1); // 如果朝北，调整位置
                    }
                    else if (String(pos).includes("south")) {
                        res = open_container(xFrame, yFrame, zFrame - 1); // 如果朝南，调整位置
                    }
                    else if (String(pos).includes("up")) {
                        res = open_container(xFrame, yFrame - 1, zFrame); // 如果朝上，调整位置
                    }
                    else if (String(pos).includes("down")) {
                        res = open_container(xFrame, yFrame + 1, zFrame); // 如果朝下，调整位置
                    }

                    // 如果容器打开失败，继续下一个展示框e
                    if (res == false) {
                        continue
                    }
                    else {
                        

                        Client.waitTick(1)

                        let inventory = Player.openInventory() 
                        let flag = 0
                       
                        empty_main_hand()

                        // 如果背包没有满，点击槽位 17
                        if (inventory.getTotalSlots() < 60) {
                            //inventory.click(17, 1)
                            moveItemFromSlotToSlot(7, 45)
                            //Chat.log(getItemIdBySlot(17))
                            flag = 45
                            Chat.log(getItemIdBySlot(flag))
                            
                        }
                        else {
                            // 如果背包满了，移动物品
                            moveItemFromSlotToSlot(16, 54)
                            flag = 54
                            Chat.log(getItemIdBySlot(flag))
                        }

                        if(getItemIdBySlot(flag)=="slimefun:NTW_CRAFTING_BLUEPRINT"){
                            close_container(inventory)
                            Chat.log("合成蓝图不可展示，已跳过")
                            empty_main_hand()
                            continue

                        }
                        if (getItemIdBySlot(flag).includes("FINALTECH")) {  
                            close_container(inventory);  
                            Chat.log("乱序物品不可展示，已跳过");  
                            empty_main_hand();  
                            continue;  
                        }             


                        me.interactEntity(entity, false) // 与展示框交互



                        item = getItemIdBySlot(flag)
                        // Client.waitTick(1)
                        // //自动掷出
                        
                        // Player.openInventory().dropSlot(flag, false) 

                        close_container(inventory) // 关闭容器

                       
                       
                            

                    }
                }
            }
        }
    }

    // 打印所有找到的展示框位置n
    if (Object.keys(displayFrames).length > 0) {
        for (let position in displayFrames) {
            //Chat.log(`空展示框位置: ${position}, 实体类型: ${displayFrames[position]}`);
        }
    } else {
        Chat.log("未找到空展示框！");
        return false
    }
}

// 调用函数_
logNearbyDisplayFrames();
