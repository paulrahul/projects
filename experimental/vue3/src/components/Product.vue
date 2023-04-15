<template>
    <div>
        Product:  {{ product_details }}
    </div>
    <a @click="$router.go(-1)">back</a>
</template>
<script>
export default {
    data() {
        return {
            product_details: null
        }
    },
    mounted() {
        let formData = new FormData()
        formData.append("product_key", this.$route.params.product_name)

        this.axios.post(import.meta.env.VITE_VUE3_SERVER + "/product/", formData)
        .then(response => {
            console.log(response.data)
            if (response.status == 200) {
                this.product_details = response.data
            } else {
                this.product_details = "No matching product found"
            }
        })
    }
}
</script>